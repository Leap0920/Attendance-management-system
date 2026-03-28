<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Get current settings
$stmt = $db->query("SELECT * FROM settings");
$settingsRaw = $stmt->fetchAll();
$settings = [];
foreach ($settingsRaw as $s) {
    $settings[$s['setting_key']] = $s['setting_value'];
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $updates = [
        'site_name' => $_POST['site_name'] ?? 'AttendEase LMS',
        'late_threshold' => $_POST['late_threshold'] ?? '5',
        'attendance_timeout' => $_POST['attendance_timeout'] ?? '15',
        'allow_student_registration' => isset($_POST['allow_student_registration']) ? '1' : '0',
        'require_email_verification' => isset($_POST['require_email_verification']) ? '1' : '0',
        'max_file_size' => $_POST['max_file_size'] ?? '10',
        'allowed_file_types' => $_POST['allowed_file_types'] ?? 'pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,png,mp4,zip',
    ];
    
    foreach ($updates as $key => $value) {
        $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt->execute([$key, $value, $value]);
    }
    
    logAudit($db, $user['id'], 'update_settings', 'settings', null);
    Session::setFlash('success', 'Settings saved successfully');
    header('Location: settings.php');
    exit;
}

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Settings - AttendEase Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/dashboard.css">
</head>
<body>
    <div class="dashboard-layout">
        <?php include 'includes/sidebar.php'; ?>
        
        <main class="main-content">
            <?php include 'includes/header.php'; ?>
            
            <div class="content-wrapper">
                <div class="page-header">
                    <div>
                        <h1>System Settings</h1>
                        <p class="text-muted">Configure application settings</p>
                    </div>
                </div>

                <?php if ($flash): ?>
                <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                    <i class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                    <?php echo $flash['message']; ?>
                </div>
                <?php endif; ?>

                <form method="POST">
                    <!-- General Settings -->
                    <div class="card" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-globe"></i> General Settings</h3>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">Site Name</label>
                                <input type="text" name="site_name" class="form-input" 
                                    value="<?php echo sanitize($settings['site_name'] ?? 'AttendEase LMS'); ?>">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">
                                        <input type="checkbox" name="allow_student_registration" value="1" 
                                            <?php echo ($settings['allow_student_registration'] ?? '1') === '1' ? 'checked' : ''; ?>>
                                        Allow Student Registration
                                    </label>
                                    <small class="text-muted">Allow new students to register accounts</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">
                                        <input type="checkbox" name="require_email_verification" value="1"
                                            <?php echo ($settings['require_email_verification'] ?? '0') === '1' ? 'checked' : ''; ?>>
                                        Require Email Verification
                                    </label>
                                    <small class="text-muted">Require email verification before login</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance Settings -->
                    <div class="card" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-calendar-check"></i> Attendance Settings</h3>
                        </div>
                        <div class="card-body">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Late Threshold (minutes)</label>
                                    <input type="number" name="late_threshold" class="form-input" min="1" max="60"
                                        value="<?php echo sanitize($settings['late_threshold'] ?? '5'); ?>">
                                    <small class="text-muted">Minutes after session starts before marking as "Late"</small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Default Session Duration (minutes)</label>
                                    <input type="number" name="attendance_timeout" class="form-input" min="5" max="120"
                                        value="<?php echo sanitize($settings['attendance_timeout'] ?? '15'); ?>">
                                    <small class="text-muted">Default duration for new attendance sessions</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- File Upload Settings -->
                    <div class="card" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-upload"></i> File Upload Settings</h3>
                        </div>
                        <div class="card-body">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Max File Size (MB)</label>
                                    <input type="number" name="max_file_size" class="form-input" min="1" max="100"
                                        value="<?php echo sanitize($settings['max_file_size'] ?? '10'); ?>">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Allowed File Types</label>
                                    <input type="text" name="allowed_file_types" class="form-input"
                                        value="<?php echo sanitize($settings['allowed_file_types'] ?? 'pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,png,mp4,zip'); ?>">
                                    <small class="text-muted">Comma-separated list of allowed extensions</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- System Info -->
                    <div class="card" style="margin-bottom: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-info-circle"></i> System Information</h3>
                        </div>
                        <div class="card-body">
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">PHP Version</span>
                                    <span class="info-value"><?php echo phpversion(); ?></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">MySQL Version</span>
                                    <span class="info-value"><?php echo $db->getAttribute(PDO::ATTR_SERVER_VERSION); ?></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Server</span>
                                    <span class="info-value"><?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Upload Max Size</span>
                                    <span class="info-value"><?php echo ini_get('upload_max_filesize'); ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary btn-lg">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <script src="../assets/js/dashboard.js"></script>
    <style>
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .info-item { background: var(--bg-card); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
        .info-label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
        .info-value { font-weight: 600; font-size: 14px; }
        .form-actions { display: flex; justify-content: flex-end; }
        .btn-lg { padding: 14px 32px; font-size: 16px; }
    </style>
</body>
</html>
