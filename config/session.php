<?php
/**
 * Session Management
 * Attendance Management System
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Session timeout (30 minutes)
define('SESSION_TIMEOUT', 1800);

class Session
{

    /**
     * Check if user is logged in
     */
    public static function isLoggedIn()
    {
        if (!isset($_SESSION['user_id']) || !isset($_SESSION['last_activity'])) {
            return false;
        }

        // Check for session timeout
        if (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT) {
            self::destroy();
            return false;
        }

        // Update last activity
        $_SESSION['last_activity'] = time();
        return true;
    }

    /**
     * Create user session
     */
    public static function create($user)
    {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['first_name'] = $user['first_name'];
        $_SESSION['last_name'] = $user['last_name'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['avatar'] = $user['avatar'];
        $_SESSION['last_activity'] = time();

        // Regenerate session ID for security
        session_regenerate_id(true);
    }

    /**
     * Get current user data
     */
    public static function getUser()
    {
        if (!self::isLoggedIn()) {
            return null;
        }

        return [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['email'],
            'first_name' => $_SESSION['first_name'],
            'last_name' => $_SESSION['last_name'],
            'full_name' => $_SESSION['first_name'] . ' ' . $_SESSION['last_name'],
            'role' => $_SESSION['role'],
            'avatar' => $_SESSION['avatar']
        ];
    }

    /**
     * Get user ID
     */
    public static function getUserId()
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * Get user role
     */
    public static function getRole()
    {
        return $_SESSION['role'] ?? null;
    }

    /**
     * Check if user has specific role
     */
    public static function hasRole($role)
    {
        return self::getRole() === $role;
    }

    /**
     * Check if user is admin
     */
    public static function isAdmin()
    {
        return self::hasRole('admin');
    }

    /**
     * Check if user is teacher
     */
    public static function isTeacher()
    {
        return self::hasRole('teacher');
    }

    /**
     * Check if user is student
     */
    public static function isStudent()
    {
        return self::hasRole('student');
    }

    /**
     * Destroy session
     */
    public static function destroy()
    {
        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();
    }

    /**
     * Set flash message
     */
    public static function setFlash($type, $message)
    {
        $_SESSION['flash'] = [
            'type' => $type,
            'message' => $message
        ];
    }

    /**
     * Get and clear flash message
     */
    public static function getFlash()
    {
        if (isset($_SESSION['flash'])) {
            $flash = $_SESSION['flash'];
            unset($_SESSION['flash']);
            return $flash;
        }
        return null;
    }

    /**
     * Require authentication
     */
    public static function requireAuth($redirect = '/index.php')
    {
        if (!self::isLoggedIn()) {
            header("Location: $redirect");
            exit;
        }
    }

    /**
     * Require specific role
     */
    public static function requireRole($role, $redirect = '/index.php')
    {
        self::requireAuth($redirect);

        if (!self::hasRole($role)) {
            self::setFlash('error', 'You do not have permission to access this page.');
            header("Location: $redirect");
            exit;
        }
    }
}
?>