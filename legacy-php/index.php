<?php
require_once 'config/session.php';
$flash = Session::getFlash();

// Redirect if already logged in
if (Session::isLoggedIn()) {
    $user = Session::getUser();
    redirect($user['role'] . '/dashboard.php');
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="AttendEase LMS - Modern Attendance Management System">
    <title>AttendEase LMS - Login</title>
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

        /* Left Side - Image Section (60-70%) */
        .auth-image-section {
            flex: 0 0 65%;
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
            max-width: 600px;
        }

        .auth-image-content .logo-large {
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
            border-radius: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 56px;
            color: white;
            margin-bottom: 32px;
            box-shadow: 0 20px 60px rgba(66, 133, 244, 0.4);
            animation: float 6s ease-in-out infinite;
        }

        @keyframes float {

            0%,
            100% {
                transform: translateY(0px);
            }

            50% {
                transform: translateY(-15px);
            }
        }

        .auth-image-content h1 {
            font-size: 48px;
            font-weight: 800;
            background: linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.8));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 16px;
        }

        .auth-image-content p {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.6;
            margin-bottom: 40px;
        }

        .features-list {
            text-align: left;
            display: inline-block;
        }

        .features-list .feature {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 12px 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
        }

        .features-list .feature i {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            font-size: 18px;
        }

        /* Right Side - Form Section (30-40%) */
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
            max-width: 420px;
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
            margin-bottom: 32px;
        }

        .auth-form-header h2 {
            font-size: 28px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .auth-form-header p {
            color: var(--text-muted);
            font-size: 15px;
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

        .input-icon-wrapper .toggle-password {
            left: auto;
            right: 16px;
            cursor: pointer;
            transition: var(--transition);
        }

        .input-icon-wrapper .toggle-password:hover {
            color: var(--primary);
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

        .remember-forgot {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            font-size: 14px;
        }

        .checkbox-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: var(--text-secondary);
        }

        .checkbox-wrapper input {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
        }

        .remember-forgot a {
            color: var(--primary);
            font-weight: 500;
            text-decoration: none;
        }

        .remember-forgot a:hover {
            text-decoration: underline;
        }

        .btn-submit {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
            border: none;
            border-radius: var(--radius);
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(66, 133, 244, 0.4);
        }

        .auth-divider {
            display: flex;
            align-items: center;
            margin: 24px 0;
            color: var(--text-muted);
            font-size: 13px;
        }

        .auth-divider::before,
        .auth-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border-color);
        }

        .auth-divider span {
            padding: 0 16px;
        }

        .demo-accounts {
            padding: 16px;
            background: rgba(66, 133, 244, 0.08);
            border: 1px solid rgba(66, 133, 244, 0.2);
            border-radius: var(--radius);
            margin-bottom: 24px;
        }

        .demo-accounts h4 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--primary);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .demo-accounts .account {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            color: var(--text-secondary);
            font-size: 13px;
        }

        .demo-accounts .account span:first-child {
            font-weight: 600;
            color: var(--text-primary);
        }

        .auth-footer {
            text-align: center;
            padding-top: 24px;
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

        .alert-success {
            background: rgba(52, 168, 83, 0.1);
            border: 1px solid rgba(52, 168, 83, 0.3);
            color: var(--success);
        }

        /* Mobile Responsive */
        @media (max-width: 1024px) {
            .auth-image-section {
                flex: 0 0 50%;
            }
        }

        @media (max-width: 768px) {
            body {
                flex-direction: column;
            }

            .auth-image-section {
                flex: 0 0 auto;
                min-height: 200px;
                padding: 40px 20px;
            }

            .auth-image-content h1 {
                font-size: 32px;
            }

            .auth-image-content p {
                font-size: 14px;
                margin-bottom: 20px;
            }

            .auth-image-content .logo-large {
                width: 80px;
                height: 80px;
                font-size: 36px;
            }

            .features-list {
                display: none;
            }

            .auth-form-section {
                padding: 30px 20px;
            }
        }
    </style>
</head>

<body>
    <!-- Left Side - Image & Branding -->
    <div class="auth-image-section">
        <div class="auth-image-content">
            <div class="logo-large">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <h1>AttendEase</h1>
            <p>Modern attendance management system designed for educational institutions. Track, manage, and analyze
                student attendance with ease.</p>
            <div class="features-list">
                <div class="feature">
                    <i class="fas fa-qrcode"></i>
                    <span>Quick code-based attendance</span>
                </div>
                <div class="feature">
                    <i class="fas fa-chart-line"></i>
                    <span>Real-time analytics & reports</span>
                </div>
                <div class="feature">
                    <i class="fas fa-users"></i>
                    <span>Multi-role access control</span>
                </div>
                <div class="feature">
                    <i class="fas fa-mobile-alt"></i>
                    <span>Mobile-friendly interface</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Side - Login Form -->
    <div class="auth-form-section">
        <div class="auth-form-container">
            <div class="auth-form-header">
                <h2>Welcome Back</h2>
                <p>Sign in to continue to your dashboard</p>
            </div>

            <?php if ($flash): ?>
                <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                    <i
                        class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                    <?php echo $flash['message']; ?>
                </div>
            <?php endif; ?>

            <form action="api/auth/login.php" method="POST">
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <div class="input-icon-wrapper">
                        <i class="fas fa-envelope"></i>
                        <input type="email" name="email" class="form-input" placeholder="Enter your email" required
                            autofocus>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-icon-wrapper">
                        <i class="fas fa-lock"></i>
                        <input type="password" name="password" id="password" class="form-input"
                            placeholder="Enter your password" required>
                        <i class="fas fa-eye toggle-password" onclick="togglePassword()"></i>
                    </div>
                </div>

                <div class="remember-forgot">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" name="remember">
                        <span>Remember me</span>
                    </label>
                    <a href="forgot_password.php">Forgot password?</a>
                </div>

                <button type="submit" class="btn-submit">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </button>
            </form>

            <div class="auth-footer">
                <p>Don't have an account? <a href="register.php">Sign up</a></p>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const input = document.getElementById('password');
            const icon = document.querySelector('.toggle-password');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }
    </script>
</body>

</html>