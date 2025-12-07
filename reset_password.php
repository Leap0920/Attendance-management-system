<?php
require_once 'config/session.php';
require_once 'config/database.php';
require_once 'includes/functions.php';

// Redirect if already logged in
if (Session::isLoggedIn()) {
    redirect(Session::getUser()['role'] . '/dashboard.php');
}

$token = $_GET['token'] ?? '';
$error = '';
$success = false;
$validToken = false;
$user = null;

if (empty($token)) {
    redirect('forgot_password.php', 'error', 'Invalid or missing reset token');
}

$db = getDB();

// Verify token
$stmt = $db->prepare("SELECT id, first_name, email FROM users 
    WHERE reset_token = ? AND reset_token_expiry > NOW() AND status = 'active'");
$stmt->execute([$token]);
$user = $stmt->fetch();

if ($user) {
    $validToken = true;
} else {
    $error = 'This reset link has expired or is invalid. Please request a new one.';
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $validToken) {
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if (empty($password)) {
        $error = 'Please enter a new password';
    } elseif (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters';
    } elseif ($password !== $confirmPassword) {
        $error = 'Passwords do not match';
    } else {
        // Update password and clear token
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?");
        $stmt->execute([$hashedPassword, $user['id']]);

        logAudit($db, $user['id'], 'password_reset_complete', 'user', $user['id']);

        $success = true;
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - AttendEase</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body class="auth-page">
    <div class="auth-container">
        <div class="auth-card animate-fade-in">
            <div class="auth-header">
                <div class="auth-logo">
                    <i class="fas fa-key"></i>
                </div>
                <h1>Reset Password</h1>
                <?php if ($validToken && !$success): ?>
                    <p class="text-muted">Create a new password for <strong><?php echo sanitize($user['email']); ?></strong>
                    </p>
                <?php endif; ?>
            </div>

            <?php if ($success): ?>
                <div class="success-message">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Password Reset Successfully!</h3>
                    <p>Your password has been updated. You can now sign in with your new password.</p>
                    <a href="index.php" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-sign-in-alt"></i> Sign In Now
                    </a>
                </div>
            <?php elseif (!$validToken): ?>
                <div class="error-message">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Invalid or Expired Link</h3>
                    <p><?php echo $error; ?></p>
                    <a href="forgot_password.php" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Request New Link
                    </a>
                </div>
            <?php else: ?>
                <?php if ($error): ?>
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <?php echo $error; ?>
                    </div>
                <?php endif; ?>

                <form method="POST" class="auth-form">
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <div class="input-group">
                            <span class="input-icon"><i class="fas fa-lock"></i></span>
                            <input type="password" name="password" class="form-input" placeholder="Enter new password"
                                minlength="6" required autofocus>
                        </div>
                        <small class="text-muted">Minimum 6 characters</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <div class="input-group">
                            <span class="input-icon"><i class="fas fa-lock"></i></span>
                            <input type="password" name="confirm_password" class="form-input"
                                placeholder="Confirm new password" minlength="6" required>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-save"></i> Reset Password
                    </button>
                </form>

                <div class="auth-footer">
                    <p>Remember your password? <a href="index.php">Sign In</a></p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <style>
        .success-message,
        .error-message {
            text-align: center;
            padding: 20px 0;
        }

        .success-icon,
        .error-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }

        .success-icon {
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
        }

        .success-icon i {
            font-size: 36px;
            color: var(--success);
        }

        .error-icon {
            background: linear-gradient(135deg, rgba(234, 67, 53, 0.2), rgba(234, 67, 53, 0.05));
        }

        .error-icon i {
            font-size: 36px;
            color: var(--danger);
        }

        .success-message h3,
        .error-message h3 {
            margin-bottom: 8px;
        }

        .success-message p,
        .error-message p {
            color: var(--text-muted);
        }
    </style>
</body>

</html>