<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Get all attendance sessions
$stmt = $db->prepare("SELECT ats.*, c.course_code, c.course_name,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'present') as present_count,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'late') as late_count,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'absent') as absent_count,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = ats.course_id AND status = 'active') as total_students
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    WHERE ats.teacher_id = ?
    ORDER BY ats.created_at DESC");
$stmt->execute([$user['id']]);
$sessions = $stmt->fetchAll();

// Get courses for filter
$stmt = $db->prepare("SELECT id, course_code, course_name FROM courses WHERE teacher_id = ? AND status = 'active'");
$stmt->execute([$user['id']]);
$courses = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Management - AttendEase</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/dashboard.css">
    <link rel="stylesheet" href="../assets/css/teacher.css">
</head>

<body>
    <div class="dashboard-layout">
        <?php include 'includes/sidebar.php'; ?>

        <main class="main-content">
            <?php include 'includes/header.php'; ?>

            <div class="content-wrapper">
                <div class="page-header">
                    <div>
                        <h1>Attendance Management</h1>
                        <p class="text-muted">View and manage all attendance sessions</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-success" onclick="openModal('newSessionModal')">
                            <i class="fas fa-plus"></i> New Session
                        </button>
                    </div>
                </div>

                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <i
                            class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <div class="card">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Session</th>
                                    <th>Code</th>
                                    <th>Present</th>
                                    <th>Late</th>
                                    <th>Absent</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($sessions as $s): ?>
                                    <tr>
                                        <td><strong><?php echo sanitize($s['course_code']); ?></strong></td>
                                        <td><?php echo sanitize($s['session_title'] ?? 'Session'); ?></td>
                                        <td><code
                                                style="background:var(--bg-card);padding:4px 8px;border-radius:4px;"><?php echo $s['attendance_code']; ?></code>
                                        </td>
                                        <td class="text-success"><?php echo $s['present_count']; ?></td>
                                        <td class="text-warning"><?php echo $s['late_count']; ?></td>
                                        <td class="text-danger"><?php echo $s['absent_count']; ?></td>
                                        <td>
                                            <span
                                                class="badge badge-<?php echo ['active' => 'success', 'closed' => 'primary', 'expired' => 'warning', 'pending' => 'secondary'][$s['status']] ?? 'primary'; ?>">
                                                <?php echo ucfirst($s['status']); ?>
                                            </span>
                                        </td>
                                        <td class="text-muted"><?php echo formatDateTime($s['created_at']); ?></td>
                                        <td>
                                            <?php if ($s['status'] === 'active'): ?>
                                                <form action="../api/teacher/attendance.php" method="POST"
                                                    style="display:inline;">
                                                    <input type="hidden" name="action" value="close">
                                                    <input type="hidden" name="session_id" value="<?php echo $s['id']; ?>">
                                                    <button type="submit" class="btn btn-danger btn-sm">Close</button>
                                                </form>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($sessions)): ?>
                                    <tr>
                                        <td colspan="9" class="text-center text-muted">No attendance sessions yet</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- New Session Modal -->
    <div class="modal-overlay" id="newSessionModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Start New Attendance Session</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('newSessionModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/attendance.php" method="POST">
                <input type="hidden" name="action" value="create">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Select Course</label>
                        <select name="course_id" class="form-input" required>
                            <option value="">Choose a course...</option>
                            <?php foreach ($courses as $c): ?>
                                <option value="<?php echo $c['id']; ?>">
                                    <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Session Title</label>
                        <input type="text" name="session_title" class="form-input" placeholder="e.g., Week 1 Lecture">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Duration</label>
                        <select name="duration" class="form-input">
                            <option value="5">5 minutes</option>
                            <option value="10" selected>10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                        </select>
                    </div>
                    <label class="checkbox-wrapper">
                        <input type="checkbox" name="allow_late" value="1" checked>
                        <span>Allow late submissions (marked as 'Late')</span>
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('newSessionModal')">Cancel</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-play"></i> Start Session</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
</body>

</html>