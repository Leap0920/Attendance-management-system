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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            display: flex;
            background: var(--bg-dark);
        }

        /* Left Side - Image Section */
        .auth-image-section {
            flex: 0 0 60%;
            position: relative;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .auth-image-section::before {
            content: '';
            position: absolute;
            inset: 0;
            background: url('image/QCU.svg') center center / cover no-repeat;
            opacity: 0.15;
        }

        .auth-image-content {
            position: relative;
            z-index: 2;
            text-align: center;
            padding: 40px;
            max-width: 500px;
        }

        .auth-image-content .logo-large {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, var(--success), #059669);
            border-radius: 25px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: white;
            margin-bottom: 28px;
            box-shadow: 0 20px 60px rgba(52, 168, 83, 0.3);
        }

        .auth-image-content h1 {
            font-size: 42px;
            font-weight: 800;
            background: linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.8));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 16px;
        }

        .auth-image-content p {
            font-size: 17px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.6;
            margin-bottom: 36px;
        }

        .password-requirements {
            text-align: left;
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 12px;
        }

        .password-requirements h4 {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .req-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
        }

        .req-item i {
            color: var(--success);
            font-size: 12px;
        }

        /* Right Side - Form Section */
        .auth-form-section {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background: var(--bg-dark);
            overflow-y: auto;
        }

        .auth-form-container {
            width: 100%;
            max-width: 400px;
            animation: slideInRight 0.6s ease;
        }

        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(30px);
            }

            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .auth-form-header {
            margin-bottom: 28px;
            text-align: center;
        }

        .auth-form-header .icon-circle {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }

        .auth-form-header .icon-circle i {
            font-size: 28px;
            color: var(--success);
        }

        .auth-form-header .icon-circle.error {
            background: linear-gradient(135deg, rgba(234, 67, 53, 0.2), rgba(234, 67, 53, 0.05));
        }

        .auth-form-header .icon-circle.error i {
            color: var(--danger);
        }

        .auth-form-header h2 {
            font-size: 26px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .auth-form-header p {
            color: var(--text-muted);
            font-size: 14px;
        }

        .auth-form-header p strong {
            color: var(--text-primary);
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .form-label small {
            font-weight: 400;
            color: var(--text-muted);
        }

        .input-icon-wrapper {
            position: relative;
        }

        .input-icon-wrapper i {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 16px;
        }

        .input-icon-wrapper .form-input {
            padding-left: 48px;
        }

        .form-input {
            width: 100%;
            padding: 14px 16px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            color: var(--text-primary);
            font-size: 15px;
            transition: var(--transition);
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
        }

        .btn-submit {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--success), #059669);
            border: none;
            border-radius: var(--radius);
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(52, 168, 83, 0.3);
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(52, 168, 83, 0.4);
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
            border: none;
            border-radius: var(--radius);
            color: white;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(66, 133, 244, 0.4);
        }

        .btn-back {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            color: var(--text-secondary);
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            transition: var(--transition);
        }

        .btn-back:hover {
            background: var(--bg-glass);
            color: var(--text-primary);
        }

        .auth-footer {
            text-align: center;
            padding-top: 20px;
            margin-top: 24px;
            border-top: 1px solid var(--border-color);
            color: var(--text-muted);
            font-size: 14px;
        }

        .auth-footer a {
            color: var(--primary);
            font-weight: 600;
            text-decoration: none;
        }

        .auth-footer a:hover {
            text-decoration: underline;
        }

        .alert {
            padding: 12px 16px;
            border-radius: var(--radius);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
        }

        .alert-error {
            background: rgba(234, 67, 53, 0.1);
            border: 1px solid rgba(234, 67, 53, 0.3);
            color: var(--danger);
        }

        /* Success/Error States */
        .state-message {
            text-align: center;
            padding: 20px 0;
        }

        .state-message .state-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
        }

        .state-message .state-icon.success {
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
        }

        .state-message .state-icon.success i {
            font-size: 36px;
            color: var(--success);
        }

        .state-message .state-icon.error {
            background: linear-gradient(135deg, rgba(234, 67, 53, 0.2), rgba(234, 67, 53, 0.05));
        }

        .state-message .state-icon.error i {
            font-size: 36px;
            color: var(--danger);
        }

        .state-message h3 {
            font-size: 22px;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        .state-message p {
            color: var(--text-muted);
            margin-bottom: 24px;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            body {
                flex-direction: column;
            }

            .auth-image-section {
                flex: 0 0 auto;
                min-height: 180px;
                padding: 30px 20px;
            }

            .auth-image-content h1 {
                font-size: 28px;
            }

            .auth-image-content p,
            .password-requirements {
                display: none;
            }

            .auth-image-content .logo-large {
                width: 70px;
                height: 70px;
                font-size: 32px;
            }

            .auth-form-section {
                padding: 25px 20px;
            }
        }
    </style>
</head>

<body>
    <!-- Left Side - Image & Branding -->
    <div class="auth-image-section">
        <div class="auth-image-content">
            <div class="logo-large">
                <i class="fas fa-shield-alt"></i>
            </div>
            <h1>New Password</h1>
            <p>Create a strong, secure password to protect your account. Your password should be unique and not used on
                other websites.</p>
            <div class="password-requirements">
                <h4><i class="fas fa-lock"></i> Password Requirements</h4>
                <div class="req-item">
                    <i class="fas fa-check-circle"></i>
                    <span>At least 6 characters long</span>
                </div>
                <div class="req-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Mix of letters and numbers recommended</span>
                </div>
                <div class="req-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Avoid common words or patterns</span>
                </div>
                <div class="req-item">
                    <i class="fas fa-check-circle"></i>
                    <span>Don't reuse passwords from other sites</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Side - Form -->
    <div class="auth-form-section">
        <div class="auth-form-container">
            <?php if ($success): ?>
                <div class="state-message">
                    <div class="state-icon success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Password Reset Successfully!</h3>
                    <p>Your password has been updated. You can now sign in with your new password.</p>
                    <a href="index.php" class="btn-primary">
                        <i class="fas fa-sign-in-alt"></i> Sign In Now
                    </a>
                </div>
            <?php elseif (!$validToken): ?>
                <div class="state-message">
                    <div class="state-icon error">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Invalid or Expired Link</h3>
                    <p><?php echo $error; ?></p>
                    <a href="forgot_password.php" class="btn-primary">
                        <i class="fas fa-redo"></i> Request New Link
                    </a>
                </div>
            <?php else: ?>
                <div class="auth-form-header">
                    <div class="icon-circle">
                        <i class="fas fa-key"></i>
                    </div>
                    <h2>Reset Password</h2>
                    <p>Create a new password for <strong><?php echo htmlspecialchars($user['email']); ?></strong></p>
                </div>

                <?php if ($error): ?>
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <?php echo $error; ?>
                    </div>
                <?php endif; ?>

                <form method="POST">
                    <div class="form-group">
                        <label class="form-label">New Password <small>(min 6 characters)</small></label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-lock"></i>
                            <input type="password" name="password" class="form-input" placeholder="Enter new password"
                                minlength="6" required autofocus>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-lock"></i>
                            <input type="password" name="confirm_password" class="form-input"
                                placeholder="Confirm new password" minlength="6" required>
                        </div>
                    </div>

                    <button type="submit" class="btn-submit">
                        <i class="fas fa-save"></i> Reset Password
                    </button>
                </form>

                <div class="auth-footer">
                    <p>Remember your password? <a href="index.php">Sign In</a></p>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>

</html>