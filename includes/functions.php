<?php
/**
 * Helper Functions
 * Attendance Management System
 */

function generateRandomString($length = 6, $uppercase = true)
{
    $chars = $uppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : 'abcdefghijklmnopqrstuvwxyz0123456789';
    $str = '';
    for ($i = 0; $i < $length; $i++) {
        $str .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $str;
}

function generateJoinCode($db)
{
    do {
        $code = generateRandomString(6);
        $stmt = $db->prepare("SELECT id FROM courses WHERE join_code = ?");
        $stmt->execute([$code]);
    } while ($stmt->fetch());
    return $code;
}

function generateAttendanceCode($db)
{
    do {
        $code = generateRandomString(6);
        $stmt = $db->prepare("SELECT id FROM attendance_sessions WHERE attendance_code = ? AND status = 'active'");
        $stmt->execute([$code]);
    } while ($stmt->fetch());
    return $code;
}

function sanitize($input)
{
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function hashPassword($password)
{
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash)
{
    return password_verify($password, $hash);
}

function formatDate($date, $format = 'M d, Y')
{
    return date($format, strtotime($date));
}

function formatDateTime($datetime, $format = 'M d, Y h:i A')
{
    return date($format, strtotime($datetime));
}

function timeAgo($datetime)
{
    $diff = time() - strtotime($datetime);
    if ($diff < 60)
        return 'Just now';
    if ($diff < 3600)
        return floor($diff / 60) . 'm ago';
    if ($diff < 86400)
        return floor($diff / 3600) . 'h ago';
    if ($diff < 604800)
        return floor($diff / 86400) . 'd ago';
    return formatDate($datetime);
}

function getInitials($firstName, $lastName)
{
    return strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1));
}

function calculateAttendanceRate($present, $total)
{
    return $total == 0 ? 0 : round(($present / $total) * 100, 1);
}

function getAttendanceStatusColor($status)
{
    $colors = ['present' => '#34A853', 'late' => '#FBBC04', 'absent' => '#EA4335', 'excused' => '#9C27B0'];
    return $colors[$status] ?? '#757575';
}

function logAudit($db, $userId, $action, $entityType, $entityId = null, $oldValues = null, $newValues = null)
{
    $stmt = $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$userId, $action, $entityType, $entityId, $oldValues ? json_encode($oldValues) : null, $newValues ? json_encode($newValues) : null, $_SERVER['REMOTE_ADDR'] ?? null]);
}

function jsonResponse($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function redirect($url, $type = null, $message = null)
{
    if ($type && $message)
        Session::setFlash($type, $message);
    header("Location: $url");
    exit;
}

function generateCSRFToken()
{
    if (empty($_SESSION['csrf_token']))
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token)
{
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function csrfField()
{
    return '<input type="hidden" name="csrf_token" value="' . generateCSRFToken() . '">';
}

function formatFileSize($bytes)
{
    if ($bytes >= 1048576)
        return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024)
        return number_format($bytes / 1024, 2) . ' KB';
    return $bytes . ' bytes';
}

function getFileIcon($filename)
{
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $icons = ['pdf' => 'fa-file-pdf', 'doc' => 'fa-file-word', 'docx' => 'fa-file-word', 'ppt' => 'fa-file-powerpoint', 'pptx' => 'fa-file-powerpoint'];
    return $icons[$ext] ?? 'fa-file';
}
?>