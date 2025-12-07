<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

// Get enrolled courses
$stmt = $db->prepare("SELECT c.*, u.first_name as teacher_first, u.last_name as teacher_last,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = c.id) as total_sessions,
    (SELECT COUNT(*) FROM attendance_records WHERE course_id = c.id AND student_id = ? AND status IN ('present', 'late')) as attended
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.teacher_id = u.id
    WHERE e.student_id = ? AND e.status = 'active' AND c.status = 'active'
    ORDER BY c.course_name");
$stmt->execute([$user['id'], $user['id']]);
$courses = $stmt->fetchAll();

// Get active attendance sessions for enrolled courses
$stmt = $db->prepare("SELECT ats.*, c.course_name, c.course_code
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.student_id = ? AND e.status = 'active' AND ats.status = 'active'
    AND ats.end_time > NOW()
    AND ats.id NOT IN (SELECT session_id FROM attendance_records WHERE student_id = ?)
    ORDER BY ats.end_time ASC");
$stmt->execute([$user['id'], $user['id']]);
$activeSessions = $stmt->fetchAll();

// Recent attendance
$stmt = $db->prepare("SELECT ar.*, c.course_name, c.course_code, ats.session_title
    FROM attendance_records ar
    JOIN courses c ON ar.course_id = c.id
    JOIN attendance_sessions ats ON ar.session_id = ats.id
    WHERE ar.student_id = ?
    ORDER BY ar.submitted_at DESC LIMIT 10");
$stmt->execute([$user['id']]);
$recentAttendance = $stmt->fetchAll();

// Stats
$totalCourses = count($courses);
$totalAttended = 0;
$totalSessions = 0;
foreach ($courses as $c) {
    $totalAttended += $c['attended'];
    $totalSessions += $c['total_sessions'];
}
$attendanceRate = $totalSessions > 0 ? round(($totalAttended / $totalSessions) * 100, 1) : 0;

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Dashboard - AttendEase</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/dashboard.css">
    <link rel="stylesheet" href="../assets/css/student.css">
</head>

<body>
    <div class="dashboard-layout">
        <?php include 'includes/sidebar.php'; ?>

        <main class="main-content">
            <?php include 'includes/header.php'; ?>

            <div class="content-wrapper">
                <div class="page-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p class="text-muted">Welcome back, <?php echo $user['first_name']; ?>!</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openModal('joinCourseModal')">
                            <i class="fas fa-plus"></i> Join Course
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

                <!-- Active Attendance Alert -->
                <?php if (!empty($activeSessions)): ?>
                    <div class="active-attendance-alert animate-fade-in">
                        <div class="alert-icon"><i class="fas fa-bell"></i></div>
                        <div class="alert-content">
                            <h3>Attendance Open!</h3>
                            <p>You have <?php echo count($activeSessions); ?> active attendance session(s) waiting for your
                                submission.</p>
                        </div>
                        <button class="btn btn-success" onclick="openModal('submitAttendanceModal')">
                            <i class="fas fa-check"></i> Submit Attendance
                        </button>
                    </div>
                <?php endif; ?>

                <!-- Stats -->
                <div class="stats-grid">
                    <div class="stat-card animate-fade-in">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i
                                class="fas fa-book"></i></div>
                        <div class="stat-value"><?php echo $totalCourses; ?></div>
                        <div class="stat-label">Enrolled Courses</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.1s">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i
                                class="fas fa-check-circle"></i></div>
                        <div class="stat-value"><?php echo $totalAttended; ?></div>
                        <div class="stat-label">Sessions Attended</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.2s">
                        <div class="stat-icon" style="background: rgba(156, 39, 176, 0.2); color: var(--purple);"><i
                                class="fas fa-calendar"></i></div>
                        <div class="stat-value"><?php echo $totalSessions; ?></div>
                        <div class="stat-label">Total Sessions</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.3s">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);"><i
                                class="fas fa-chart-pie"></i></div>
                        <div class="stat-value"><?php echo $attendanceRate; ?>%</div>
                        <div class="stat-label">Attendance Rate</div>
                    </div>
                </div>

                <!-- My Courses -->
                <div class="section-header" style="margin-top: 32px;">
                    <h2>My Courses</h2>
                </div>

                <div class="courses-grid">
                    <?php foreach ($courses as $course):
                        $courseRate = $course['total_sessions'] > 0 ? round(($course['attended'] / $course['total_sessions']) * 100, 1) : 100;
                        ?>
                        <div class="course-card animate-fade-in"
                            style="border-top: 4px solid <?php echo $course['cover_color']; ?>;">
                            <div class="course-header"
                                style="background: linear-gradient(135deg, <?php echo $course['cover_color']; ?>20, transparent);">
                                <h3><?php echo sanitize($course['course_code']); ?></h3>
                                <p><?php echo sanitize($course['course_name']); ?></p>
                                <span class="teacher-name"><i class="fas fa-user"></i>
                                    <?php echo sanitize($course['teacher_first'] . ' ' . $course['teacher_last']); ?></span>
                            </div>
                            <div class="course-attendance-summary">
                                <div class="attendance-bar">
                                    <div class="attendance-fill"
                                        style="width: <?php echo $courseRate; ?>%; background: <?php echo $courseRate >= 75 ? 'var(--success)' : ($courseRate >= 50 ? 'var(--warning)' : 'var(--danger)'); ?>;">
                                    </div>
                                </div>
                                <div class="attendance-text">
                                    <span><?php echo $course['attended']; ?>/<?php echo $course['total_sessions']; ?>
                                        sessions</span>
                                    <span class="rate"><?php echo $courseRate; ?>%</span>
                                </div>
                            </div>
                            <div class="course-actions">
                                <a href="course.php?id=<?php echo $course['id']; ?>" class="btn btn-ghost btn-sm">View
                                    Details</a>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if (empty($courses)): ?>
                        <div class="empty-state">
                            <i class="fas fa-book-open"></i>
                            <h3>No Courses Yet</h3>
                            <p>Join a course using the class code from your teacher</p>
                            <button class="btn btn-primary" onclick="openModal('joinCourseModal')">
                                <i class="fas fa-plus"></i> Join Course
                            </button>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Recent Attendance -->
                <div class="card animate-fade-in" style="margin-top: 32px;">
                    <div class="card-header">
                        <h3><i class="fas fa-history"></i> Recent Attendance</h3>
                        <a href="attendance.php" class="btn btn-ghost btn-sm">View All</a>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Session</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($recentAttendance as $record): ?>
                                    <tr>
                                        <td><strong><?php echo sanitize($record['course_code']); ?></strong></td>
                                        <td><?php echo sanitize($record['session_title'] ?? 'Session'); ?></td>
                                        <td>
                                            <span
                                                class="badge badge-<?php echo ['present' => 'success', 'late' => 'warning', 'absent' => 'danger', 'excused' => 'primary'][$record['status']]; ?>">
                                                <?php echo ucfirst($record['status']); ?>
                                            </span>
                                        </td>
                                        <td class="text-muted"><?php echo formatDateTime($record['submitted_at']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($recentAttendance)): ?>
                                    <tr>
                                        <td colspan="4" class="text-center text-muted">No attendance records yet</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Join Course Modal -->
    <div class="modal-overlay" id="joinCourseModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Join a Course</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('joinCourseModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/student/courses.php" method="POST">
                <input type="hidden" name="action" value="join">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Class Join Code</label>
                        <input type="text" name="join_code" class="form-input code-input" placeholder="e.g., ABC123"
                            maxlength="10" required
                            style="text-transform: uppercase; letter-spacing: 4px; font-size: 24px; text-align: center;">
                        <p class="text-muted" style="margin-top: 8px; font-size: 13px;">Enter the 6-character code
                            provided by your teacher</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('joinCourseModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Join Course</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Submit Attendance Modal -->
    <div class="modal-overlay" id="submitAttendanceModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Submit Attendance</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('submitAttendanceModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/student/attendance.php" method="POST">
                <input type="hidden" name="action" value="submit">
                <div class="modal-body">
                    <?php if (!empty($activeSessions)): ?>
                        <div class="active-sessions-list">
                            <?php foreach ($activeSessions as $session): ?>
                                <div class="session-option">
                                    <input type="radio" name="session_id" value="<?php echo $session['id']; ?>"
                                        id="session_<?php echo $session['id']; ?>" required>
                                    <label for="session_<?php echo $session['id']; ?>">
                                        <strong><?php echo sanitize($session['course_code']); ?></strong> -
                                        <?php echo sanitize($session['course_name']); ?>
                                        <span class="session-timer" data-end="<?php echo $session['end_time']; ?>">
                                            <i class="fas fa-clock"></i> <span class="timer-display">--:--</span> remaining
                                        </span>
                                    </label>
                                </div>
                            <?php endforeach; ?>
                        </div>
                        <div class="form-group" style="margin-top: 20px;">
                            <label class="form-label">Attendance Code</label>
                            <input type="text" name="attendance_code" class="form-input code-input" placeholder="Enter code"
                                maxlength="10" required
                                style="text-transform: uppercase; letter-spacing: 4px; font-size: 24px; text-align: center;">
                        </div>
                    <?php else: ?>
                        <p class="text-muted text-center">No active attendance sessions available.</p>
                    <?php endif; ?>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost"
                        onclick="closeModal('submitAttendanceModal')">Cancel</button>
                    <?php if (!empty($activeSessions)): ?>
                        <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Submit</button>
                    <?php endif; ?>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        // Update session timers
        function updateTimers() {
            document.querySelectorAll('.session-timer').forEach(timer => {
                const endTime = new Date(timer.dataset.end).getTime();
                const now = new Date().getTime();
                const diff = endTime - now;
                if (diff > 0) {
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    timer.querySelector('.timer-display').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                } else {
                    timer.querySelector('.timer-display').textContent = 'Expired';
                    timer.style.color = 'var(--danger)';
                }
            });
        }
        setInterval(updateTimers, 1000);
        updateTimers();
    </script>
</body>

</html>