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
    <meta name="description" content="Create your AttendEase LMS account">
    <title>Register - AttendEase LMS</title>
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
            max-width: 550px;
        }

        .auth-image-content .logo-large {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
            border-radius: 25px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: white;
            margin-bottom: 28px;
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

        .benefits-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            text-align: left;
        }

        .benefit-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.9);
        }

        .benefit-item i {
            width: 36px;
            height: 36px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            font-size: 16px;
            flex-shrink: 0;
        }

        .benefit-item span {
            font-size: 14px;
            line-height: 1.4;
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
            max-width: 440px;
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

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .form-group {
            margin-bottom: 18px;
        }

        .form-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 6px;
        }

        .input-icon-wrapper {
            position: relative;
        }

        .input-icon-wrapper i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 15px;
        }

        .input-icon-wrapper .form-input {
            padding-left: 44px;
        }

        .form-input,
        .form-select {
            width: 100%;
            padding: 12px 14px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            color: var(--text-primary);
            font-size: 14px;
            transition: var(--transition);
        }

        .form-input:focus,
        .form-select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.15);
        }

        .btn-submit {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
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
            box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
            margin-top: 8px;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(66, 133, 244, 0.4);
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
            padding: 12px 14px;
            border-radius: var(--radius);
            margin-bottom: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
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
                flex: 0 0 45%;
            }

            .benefits-grid {
                grid-template-columns: 1fr;
            }
        }

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

            .auth-image-content p {
                display: none;
            }

            .auth-image-content .logo-large {
                width: 70px;
                height: 70px;
                font-size: 32px;
            }

            .benefits-grid {
                display: none;
            }

            .auth-form-section {
                padding: 25px 20px;
            }

            .form-row {
                grid-template-columns: 1fr;
                gap: 0;
            }
        }
    </style>
</head>

<body>
    <!-- Left Side - Image & Branding -->
    <div class="auth-image-section">
        <div class="auth-image-content">
            <div class="logo-large">
                <i class="fas fa-user-plus"></i>
            </div>
            <h1>Join AttendEase</h1>
            <p>Create your account to access the modern attendance management system for educational institutions.</p>
            <div class="benefits-grid">
                <div class="benefit-item">
                    <i class="fas fa-bolt"></i>
                    <span>Quick & easy attendance submission</span>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-chart-bar"></i>
                    <span>Track your attendance history</span>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-bell"></i>
                    <span>Real-time notifications</span>
                </div>
                <div class="benefit-item">
                    <i class="fas fa-shield-alt"></i>
                    <span>Secure & private data</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Right Side - Register Form -->
    <div class="auth-form-section">
        <div class="auth-form-container">
            <div class="auth-form-header">
                <h2>Create Account</h2>
                <p>Fill in your details to get started</p>
            </div>

            <?php if ($flash): ?>
                <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                    <i
                        class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                    <?php echo $flash['message']; ?>
                </div>
            <?php endif; ?>

            <form action="api/auth/register.php" method="POST">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">First Name</label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-user"></i>
                            <input type="text" name="first_name" class="form-input" placeholder="First name" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name</label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-user"></i>
                            <input type="text" name="last_name" class="form-input" placeholder="Last name" required>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <div class="input-icon-wrapper">
                        <i class="fas fa-envelope"></i>
                        <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Password</label>
                    <div class="input-icon-wrapper">
                        <i class="fas fa-lock"></i>
                        <input type="password" name="password" class="form-input"
                            placeholder="Create a password (min 6 chars)" minlength="6" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">I am a...</label>
                        <select name="role" class="form-select">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher / Professor</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Student ID (Optional)</label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-id-card"></i>
                            <input type="text" name="student_id" class="form-input" placeholder="Your ID">
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn-submit">
                    <i class="fas fa-user-plus"></i>
                    Create Account
                </button>
            </form>

            <div class="auth-footer">
                <p>Already have an account? <a href="index.php">Sign in</a></p>
            </div>
        </div>
    </div>
</body>

</html>