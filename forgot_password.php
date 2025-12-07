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
            // For demo, we'll show the link directly
            $resetLink = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/reset_password.php?token=" . $token;

            // Log the action
            logAudit($db, $user['id'], 'password_reset_request', 'user', $user['id']);

            $emailSent = true;
            $_SESSION['reset_link'] = $resetLink; // For demo purposes only
        } else {
            // Don't reveal if email exists or not (security)
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body class="auth-page">
    <div class="auth-container">
        <div class="auth-card animate-fade-in">
            <div class="auth-header">
                <div class="auth-logo">
                    <i class="fas fa-user-clock"></i>
                </div>
                <h1>Forgot Password</h1>
                <p class="text-muted">Enter your email to reset your password</p>
            </div>

            <?php if ($emailSent): ?>
                <div class="success-message">
                    <div class="success-icon">
                        <i class="fas fa-envelope-circle-check"></i>
                    </div>
                    <h3>Check Your Email</h3>
                    <p>If an account exists with that email, we've sent password reset instructions.</p>

                    <!-- Demo Only: Show reset link directly -->
                    <?php if (isset($_SESSION['reset_link'])): ?>
                        <div class="demo-notice">
                            <strong><i class="fas fa-info-circle"></i> Demo Mode:</strong>
                            <p>Since this is a demo, here's your reset link:</p>
                            <a href="<?php echo $_SESSION['reset_link']; ?>" class="reset-link-demo">
                                Reset Password →
                            </a>
                            <?php unset($_SESSION['reset_link']); ?>
                        </div>
                    <?php endif; ?>

                    <a href="index.php" class="btn btn-ghost" style="margin-top: 20px;">
                        <i class="fas fa-arrow-left"></i> Back to Login
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
                        <label class="form-label">Email Address</label>
                        <div class="input-group">
                            <span class="input-icon"><i class="fas fa-envelope"></i></span>
                            <input type="email" name="email" class="form-input" placeholder="Enter your email"
                                value="<?php echo isset($_POST['email']) ? sanitize($_POST['email']) : ''; ?>" required
                                autofocus>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-paper-plane"></i> Send Reset Link
                    </button>
                </form>

                <div class="auth-footer">
                    <p>Remember your password? <a href="index.php">Sign In</a></p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <style>
        .success-message {
            text-align: center;
            padding: 20px 0;
        }

        .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }

        .success-icon i {
            font-size: 36px;
            color: var(--success);
        }

        .success-message h3 {
            margin-bottom: 8px;
        }

        .success-message p {
            color: var(--text-muted);
        }

        .demo-notice {
            margin-top: 24px;
            padding: 16px;
            background: rgba(66, 133, 244, 0.1);
            border: 1px solid rgba(66, 133, 244, 0.3);
            border-radius: var(--radius);
            text-align: left;
        }

        .demo-notice strong {
            color: var(--primary);
            display: block;
            margin-bottom: 8px;
        }

        .demo-notice p {
            margin: 8px 0;
            font-size: 13px;
        }

        .reset-link-demo {
            display: inline-block;
            padding: 10px 20px;
            background: var(--primary);
            color: white;
            border-radius: var(--radius);
            text-decoration: none;
            font-weight: 500;
            margin-top: 8px;
        }

        .reset-link-demo:hover {
            background: var(--primary-dark);
        }
    </style>
</body>

</html>