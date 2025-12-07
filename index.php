<?php
require_once 'config/session.php';
$flash = Session::getFlash();
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
        .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-card {
            width: 100%;
            max-width: 440px;
            padding: 48px;
            animation: fadeInUp 0.6s ease;
        }

        .login-logo {
            text-align: center;
            margin-bottom: 40px;
        }

        .login-logo .logo-icon {
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            margin-bottom: 16px;
            box-shadow: 0 8px 32px rgba(66, 133, 244, 0.4);
        }

        .login-logo h1 {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.7));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .login-logo p {
            color: var(--text-muted);
            font-size: 14px;
            margin-top: 4px;
        }

        .login-form .form-input {
            padding-left: 48px;
        }

        .input-icon {
            position: relative;
        }

        .input-icon i {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 16px;
        }

        .input-icon .toggle-password {
            left: auto;
            right: 16px;
            cursor: pointer;
            transition: var(--transition);
        }

        .input-icon .toggle-password:hover {
            color: var(--primary);
        }

        .login-form .btn-primary {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            margin-top: 8px;
        }

        .login-footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid var(--border-color);
        }

        .login-footer a {
            color: var(--primary);
            font-weight: 500;
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
        }

        .checkbox-wrapper input {
            width: 18px;
            height: 18px;
            accent-color: var(--primary);
        }

        .demo-accounts {
            margin-top: 24px;
            padding: 16px;
            background: rgba(66, 133, 244, 0.1);
            border-radius: var(--radius-sm);
            font-size: 13px;
        }

        .demo-accounts h4 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--primary);
            margin-bottom: 12px;
        }

        .demo-accounts .account {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            color: var(--text-secondary);
        }

        .demo-accounts .account span:first-child {
            font-weight: 600;
            color: var(--text-primary);
        }

        .floating-shapes {
            position: fixed;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
            z-index: -1;
        }

        .floating-shapes .shape {
            position: absolute;
            border-radius: 50%;
            opacity: 0.1;
            animation: float 20s infinite ease-in-out;
        }

        .floating-shapes .shape:nth-child(1) {
            width: 200px;
            height: 200px;
            background: var(--primary);
            top: 10%;
            left: 10%;
        }

        .floating-shapes .shape:nth-child(2) {
            width: 150px;
            height: 150px;
            background: var(--purple);
            top: 60%;
            right: 15%;
            animation-delay: -5s;
        }

        .floating-shapes .shape:nth-child(3) {
            width: 100px;
            height: 100px;
            background: var(--success);
            bottom: 20%;
            left: 20%;
            animation-delay: -10s;
        }

        @keyframes float {

            0%,
            100% {
                transform: translate(0, 0) rotate(0deg);
            }

            25% {
                transform: translate(30px, -30px) rotate(5deg);
            }

            50% {
                transform: translate(-20px, 20px) rotate(-5deg);
            }

            75% {
                transform: translate(20px, 10px) rotate(3deg);
            }
        }
    </style>
</head>

<body>
    <div class="floating-shapes">
        <div class="shape"></div>
        <div class="shape"></div>
        <div class="shape"></div>
    </div>

    <div class="login-container">
        <div class="login-card glass-card">
            <div class="login-logo">
                <div class="logo-icon">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h1>AttendEase</h1>
                <p>Attendance Management System</p>
            </div>

            <?php if ($flash): ?>
                <div class="alert alert-<?php echo $flash['type']; ?>">
                    <i
                        class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                    <?php echo $flash['message']; ?>
                </div>
            <?php endif; ?>

            <form class="login-form" action="api/auth/login.php" method="POST">
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <div class="input-icon">
                        <i class="fas fa-envelope"></i>
                        <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-icon">
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

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i>
                    Sign In
                </button>
            </form>

            <div class="demo-accounts">
                <h4><i class="fas fa-info-circle"></i> Demo Accounts</h4>
                <div class="account">
                    <span>Admin</span>
                    <span>admin@lms.com / admin123</span>
                </div>
                <div class="account">
                    <span>Teacher</span>
                    <span>teacher@lms.com / teacher123</span>
                </div>
                <div class="account">
                    <span>Student</span>
                    <span>student1@lms.com / student123</span>
                </div>
            </div>

            <div class="login-footer">
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