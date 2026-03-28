<?php
require_once 'config/session.php';
require_once 'config/database.php';
require_once 'includes/functions.php';

// Redirect if already logged in
if (Session::isLoggedIn()) {
    redirect(Session::getUser()['role'] . '/dashboard.php');
}

$flash = Session::getFlash();
$emailSent = false;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');

    if (empty($email)) {
        $error = 'Please enter your email address';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Please enter a valid email address';
    } else {
        $db = getDB();

        // Check if email exists
        $stmt = $db->prepare("SELECT id, first_name, email FROM users WHERE email = ? AND status = 'active'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            // Generate reset token
            $token = bin2hex(random_bytes(32));
            $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Store token in database
            $stmt = $db->prepare("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?");
            $stmt->execute([$token, $expiry, $user['id']]);

            // In production, send email here
            $resetLink = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/reset_password.php?token=" . $token;

            logAudit($db, $user['id'], 'password_reset_request', 'user', $user['id']);

            $emailSent = true;
            $_SESSION['reset_link'] = $resetLink;
        } else {
            $emailSent = true;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password - AttendEase</title>
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
            background: linear-gradient(135deg, var(--warning), #f59e0b);
            border-radius: 25px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: white;
            margin-bottom: 28px;
            box-shadow: 0 20px 60px rgba(251, 188, 4, 0.3);
            animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {

            0%,
            100% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.05);
            }
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

        .security-tips {
            text-align: left;
        }

        .security-tips h4 {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .tip-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 0;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
        }

        .tip-item i {
            color: var(--success);
            font-size: 14px;
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
            background: linear-gradient(135deg, rgba(251, 188, 4, 0.2), rgba(251, 188, 4, 0.05));
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }

        .auth-form-header .icon-circle i {
            font-size: 28px;
            color: var(--warning);
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
            background: linear-gradient(135deg, var(--warning), #f59e0b);
            border: none;
            border-radius: var(--radius);
            color: #1a1a2e;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(251, 188, 4, 0.3);
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(251, 188, 4, 0.4);
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
            margin-top: 16px;
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

        /* Success State */
        .success-state {
            text-align: center;
            padding: 20px 0;
        }

        .success-state .success-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
        }

        .success-state .success-icon i {
            font-size: 36px;
            color: var(--success);
        }

        .success-state h3 {
            font-size: 22px;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        .success-state p {
            color: var(--text-muted);
            margin-bottom: 20px;
        }

        .demo-notice {
            padding: 16px;
            background: rgba(66, 133, 244, 0.1);
            border: 1px solid rgba(66, 133, 244, 0.3);
            border-radius: var(--radius);
            text-align: left;
            margin: 20px 0;
        }

        .demo-notice strong {
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            font-size: 13px;
        }

        .demo-notice p {
            font-size: 13px;
            margin: 0 0 12px;
            color: var(--text-secondary);
        }

        .reset-link-btn {
            display: inline-block;
            padding: 10px 20px;
            background: var(--primary);
            color: white;
            border-radius: var(--radius);
            text-decoration: none;
            font-weight: 500;
            font-size: 14px;
            transition: var(--transition);
        }

        .reset-link-btn:hover {
            background: var(--primary-dark);
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
            .security-tips {
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
                <i class="fas fa-key"></i>
            </div>
            <h1>Reset Password</h1>
            <p>Don't worry! It happens to the best of us. Enter your email address and we'll send you a link to reset
                your password.</p>
            <div class="security-tips">
                <h4><i class="fas fa-shield-alt"></i> Security Tips</h4>
                <div class="tip-item">
                    <i class="fas fa-check"></i>
                    <span>Use a strong, unique password</span>
                </div>
                <div class="tip-item">
                    <i class="fas fa-check"></i>
                    <span>Never share your password with others</span>
                </div>
                <div class="tip-item">
                    <i class="fas fa-check"></i>
                    <span>Enable two-factor authentication if available</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Side - Form -->
    <div class="auth-form-section">
        <div class="auth-form-container">
            <?php if ($emailSent): ?>
                <div class="success-state">
                    <div class="success-icon">
                        <i class="fas fa-envelope-circle-check"></i>
                    </div>
                    <h3>Check Your Email</h3>
                    <p>If an account exists with that email, we've sent password reset instructions.</p>

                    <?php if (isset($_SESSION['reset_link'])): ?>
                        <div class="demo-notice">
                            <strong><i class="fas fa-info-circle"></i> Demo Mode</strong>
                            <p>Since this is a demo, here's your reset link:</p>
                            <a href="<?php echo $_SESSION['reset_link']; ?>" class="reset-link-btn">
                                Reset Password →
                            </a>
                            <?php unset($_SESSION['reset_link']); ?>
                        </div>
                    <?php endif; ?>

                    <a href="index.php" class="btn-back">
                        <i class="fas fa-arrow-left"></i> Back to Login
                    </a>
                </div>
            <?php else: ?>
                <div class="auth-form-header">
                    <div class="icon-circle">
                        <i class="fas fa-lock-open"></i>
                    </div>
                    <h2>Forgot Password?</h2>
                    <p>Enter your email to reset your password</p>
                </div>

                <?php if ($error): ?>
                    <div class="alert alert-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <?php echo $error; ?>
                    </div>
                <?php endif; ?>

                <form method="POST">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-envelope"></i>
                            <input type="email" name="email" class="form-input" placeholder="Enter your email"
                                value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email']) : ''; ?>"
                                required autofocus>
                        </div>
                    </div>

                    <button type="submit" class="btn-submit">
                        <i class="fas fa-paper-plane"></i> Send Reset Link
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