<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

$courseId = $_GET['id'] ?? 0;

// Get course details
$stmt = $db->prepare("SELECT * FROM courses WHERE id = ? AND teacher_id = ? AND status = 'active'");
$stmt->execute([$courseId, $user['id']]);
$course = $stmt->fetch();

if (!$course) {
    redirect('dashboard.php', 'error', 'Course not found');
}

// Get enrolled students
$stmt = $db->prepare("SELECT u.*, e.enrolled_at,
    (SELECT COUNT(*) FROM attendance_records WHERE student_id = u.id AND course_id = ? AND status IN ('present','late')) as attended,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = ?) as total_sessions
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.course_id = ? AND e.status = 'active'
    ORDER BY u.last_name, u.first_name");
$stmt->execute([$courseId, $courseId, $courseId]);
$students = $stmt->fetchAll();

// Get attendance sessions
$stmt = $db->prepare("SELECT ats.*,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'present') as present_count,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'late') as late_count,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'absent') as absent_count
    FROM attendance_sessions ats
    WHERE ats.course_id = ?
    ORDER BY ats.created_at DESC");
$stmt->execute([$courseId]);
$sessions = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo sanitize($course['course_name']); ?> - AttendEase</title>
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
                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <i
                            class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <!-- Course Header -->
                <div class="course-detail-header" style="border-left-color: <?php echo $course['cover_color']; ?>;">
                    <div class="flex justify-between items-center">
                        <div>
                            <h1><?php echo sanitize($course['course_code']); ?> -
                                <?php echo sanitize($course['course_name']); ?></h1>
                            <p class="text-muted"><?php echo sanitize($course['description'] ?? 'No description'); ?>
                            </p>
                        </div>
                        <button class="btn btn-success" onclick="openAttendanceModal()">
                            <i class="fas fa-qrcode"></i> Start Attendance
                        </button>
                    </div>
                    <div class="course-meta">
                        <div class="meta-item"><i class="fas fa-hashtag"></i> Join Code:
                            <strong><?php echo $course['join_code']; ?></strong></div>
                        <div class="meta-item"><i class="fas fa-users"></i> <?php echo count($students); ?> Students
                        </div>
                        <div class="meta-item"><i class="fas fa-calendar"></i> <?php echo count($sessions); ?> Sessions
                        </div>
                        <?php if ($course['schedule']): ?>
                            <div class="meta-item"><i class="fas fa-clock"></i> <?php echo sanitize($course['schedule']); ?>
                            </div><?php endif; ?>
                        <?php if ($course['room']): ?>
                            <div class="meta-item"><i class="fas fa-door-open"></i> <?php echo sanitize($course['room']); ?>
                            </div><?php endif; ?>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="tabs">
                    <button class="tab-btn active" onclick="showTab('students')">Students</button>
                    <button class="tab-btn" onclick="showTab('sessions')">Attendance Sessions</button>
                </div>

                <!-- Students Tab -->
                <div class="tab-content active" id="students-tab">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-users"></i> Enrolled Students (<?php echo count($students); ?>)</h3>
                        </div>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Student ID</th>
                                        <th>Email</th>
                                        <th>Attendance</th>
                                        <th>Rate</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($students as $s):
                                        $rate = $s['total_sessions'] > 0 ? round(($s['attended'] / $s['total_sessions']) * 100, 1) : 100;
                                        ?>
                                        <tr>
                                            <td>
                                                <div class="user-info">
                                                    <div class="avatar-initials" style="background:var(--success);">
                                                        <?php echo getInitials($s['first_name'], $s['last_name']); ?></div>
                                                    <span><?php echo sanitize($s['first_name'] . ' ' . $s['last_name']); ?></span>
                                                </div>
                                            </td>
                                            <td><?php echo sanitize($s['student_id'] ?? '-'); ?></td>
                                            <td><?php echo sanitize($s['email']); ?></td>
                                            <td><?php echo $s['attended']; ?>/<?php echo $s['total_sessions']; ?></td>
                                            <td>
                                                <span
                                                    class="badge badge-<?php echo $rate >= 75 ? 'success' : ($rate >= 50 ? 'warning' : 'danger'); ?>">
                                                    <?php echo $rate; ?>%
                                                </span>
                                            </td>
                                            <td>
                                                <form action="../api/teacher/courses.php" method="POST"
                                                    style="display:inline;"
                                                    onsubmit="return confirm('Remove this student?');">
                                                    <input type="hidden" name="action" value="remove_student">
                                                    <input type="hidden" name="course_id" value="<?php echo $courseId; ?>">
                                                    <input type="hidden" name="student_id" value="<?php echo $s['id']; ?>">
                                                    <button type="submit" class="btn btn-icon btn-ghost text-danger"><i
                                                            class="fas fa-user-minus"></i></button>
                                                </form>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                    <?php if (empty($students)): ?>
                                        <tr>
                                            <td colspan="6" class="text-center text-muted">No students enrolled yet</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Sessions Tab -->
                <div class="tab-content" id="sessions-tab">
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-calendar-check"></i> Attendance Sessions</h3>
                        </div>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Session</th>
                                        <th>Code</th>
                                        <th>Present</th>
                                        <th>Late</th>
                                        <th>Absent</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($sessions as $s): ?>
                                        <tr>
                                            <td><?php echo sanitize($s['session_title'] ?? 'Session'); ?></td>
                                            <td><code><?php echo $s['attendance_code']; ?></code></td>
                                            <td class="text-success"><?php echo $s['present_count']; ?></td>
                                            <td class="text-warning"><?php echo $s['late_count']; ?></td>
                                            <td class="text-danger"><?php echo $s['absent_count']; ?></td>
                                            <td><span
                                                    class="badge badge-<?php echo $s['status'] === 'active' ? 'success' : 'primary'; ?>"><?php echo ucfirst($s['status']); ?></span>
                                            </td>
                                            <td class="text-muted"><?php echo formatDateTime($s['created_at']); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                    <?php if (empty($sessions)): ?>
                                        <tr>
                                            <td colspan="7" class="text-center text-muted">No sessions yet</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Start Attendance Modal -->
    <div class="modal-overlay" id="attendanceModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Start Attendance</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('attendanceModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/attendance.php" method="POST">
                <input type="hidden" name="action" value="create">
                <input type="hidden" name="course_id" value="<?php echo $courseId; ?>">
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">Session Title</label><input type="text"
                            name="session_title" class="form-input" placeholder="e.g., Week 1 Lecture"></div>
                    <div class="form-group">
                        <label class="form-label">Duration</label>
                        <select name="duration" class="form-input">
                            <option value="5">5 minutes</option>
                            <option value="10" selected>10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                        </select>
                    </div>
                    <label class="checkbox-wrapper"><input type="checkbox" name="allow_late" value="1"
                            checked><span>Allow late submissions</span></label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('attendanceModal')">Cancel</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-play"></i> Start</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        function showTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');
        }
        function openAttendanceModal() { openModal('attendanceModal'); }
    </script>
</body>

</html>