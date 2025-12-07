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
        .register-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .register-card {
            width: 100%;
            max-width: 500px;
            padding: 40px;
            animation: fadeInUp 0.6s ease;
        }

        .register-logo {
            text-align: center;
            margin-bottom: 32px;
        }

        .register-logo .logo-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, var(--primary), var(--purple));
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            color: white;
            margin-bottom: 12px;
        }

        .register-logo h1 {
            font-size: 24px;
            font-weight: 700;
        }

        .register-logo p {
            color: var(--text-muted);
            font-size: 14px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .register-form .btn-primary {
            width: 100%;
            padding: 14px;
            font-size: 16px;
            margin-top: 8px;
        }

        .register-footer {
            text-align: center;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
        }

        .register-form .form-input {
            padding-left: 44px;
        }

        .input-icon {
            position: relative;
        }

        .input-icon i {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }
    </style>
</head>

<body>
    <div class="register-container">
        <div class="register-card glass-card">
            <div class="register-logo">
                <div class="logo-icon"><i class="fas fa-graduation-cap"></i></div>
                <h1>Create Account</h1>
                <p>Join AttendEase LMS</p>
            </div>

            <?php
            require_once 'config/session.php';
            $flash = Session::getFlash();
            if ($flash): ?>
                <div class="alert alert-<?php echo $flash['type']; ?>">
                    <i
                        class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                    <?php echo $flash['message']; ?>
                </div>
            <?php endif; ?>

            <form class="register-form" action="api/auth/register.php" method="POST">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">First Name</label>
                        <div class="input-icon">
                            <i class="fas fa-user"></i>
                            <input type="text" name="first_name" class="form-input" placeholder="First name" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name</label>
                        <div class="input-icon">
                            <i class="fas fa-user"></i>
                            <input type="text" name="last_name" class="form-input" placeholder="Last name" required>
                        </div>
                    </div>
                </div>
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
                        <input type="password" name="password" class="form-input" placeholder="Create a password"
                            minlength="6" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">I am a...</label>
                    <select name="role" class="form-input" style="padding-left:14px;">
                        <option value="student">Student</option>
                        <option value="teacher">Teacher / Professor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Student ID (Optional)</label>
                    <div class="input-icon">
                        <i class="fas fa-id-card"></i>
                        <input type="text" name="student_id" class="form-input" placeholder="Your student ID">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-user-plus"></i> Create Account
                </button>
            </form>

            <div class="register-footer">
                <p>Already have an account? <a href="index.php">Sign in</a></p>
            </div>
        </div>
    </div>
</body>

</html>