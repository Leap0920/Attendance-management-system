<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Get teacher's courses
$stmt = $db->prepare("SELECT c.*, 
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = c.id) as session_count
    FROM courses c WHERE c.teacher_id = ? AND c.status = 'active' ORDER BY c.created_at DESC");
$stmt->execute([$user['id']]);
$courses = $stmt->fetchAll();

// Get active attendance sessions
$stmt = $db->prepare("SELECT ats.*, c.course_name, c.course_code 
    FROM attendance_sessions ats 
    JOIN courses c ON ats.course_id = c.id 
    WHERE ats.teacher_id = ? AND ats.status = 'active' 
    ORDER BY ats.start_time DESC");
$stmt->execute([$user['id']]);
$activeSessions = $stmt->fetchAll();

// Stats
$totalStudents = 0;
$totalSessions = 0;
foreach ($courses as $c) {
    $totalStudents += $c['student_count'];
    $totalSessions += $c['session_count'];
}

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Dashboard - AttendEase</title>
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
                        <h1>Dashboard</h1>
                        <p class="text-muted">Welcome back, <?php echo $user['first_name']; ?>!</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openModal('createCourseModal')">
                            <i class="fas fa-plus"></i> Create Course
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

                <!-- Stats -->
                <div class="stats-grid">
                    <div class="stat-card animate-fade-in">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i
                                class="fas fa-book"></i></div>
                        <div class="stat-value"><?php echo count($courses); ?></div>
                        <div class="stat-label">Active Courses</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.1s">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i
                                class="fas fa-user-graduate"></i></div>
                        <div class="stat-value"><?php echo $totalStudents; ?></div>
                        <div class="stat-label">Total Students</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.2s">
                        <div class="stat-icon" style="background: rgba(156, 39, 176, 0.2); color: var(--purple);"><i
                                class="fas fa-calendar-check"></i></div>
                        <div class="stat-value"><?php echo $totalSessions; ?></div>
                        <div class="stat-label">Sessions Created</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.3s">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);"><i
                                class="fas fa-clock"></i></div>
                        <div class="stat-value"><?php echo count($activeSessions); ?></div>
                        <div class="stat-label">Active Sessions</div>
                    </div>
                </div>

                <!-- Active Attendance Sessions -->
                <?php if (!empty($activeSessions)): ?>
                    <div class="card animate-fade-in" style="margin-top: 32px;">
                        <div class="card-header">
                            <h3><i class="fas fa-broadcast-tower text-success"></i> Active Attendance Sessions</h3>
                        </div>
                        <div class="active-sessions">
                            <?php foreach ($activeSessions as $session): ?>
                                <div class="session-card active-session">
                                    <div class="session-info">
                                        <h4><?php echo sanitize($session['course_code']); ?> -
                                            <?php echo sanitize($session['course_name']); ?></h4>
                                        <p><?php echo sanitize($session['session_title'] ?? 'Attendance Session'); ?></p>
                                    </div>
                                    <div class="session-code">
                                        <div class="code-display"><?php echo $session['attendance_code']; ?></div>
                                        <button class="btn btn-ghost btn-sm"
                                            onclick="copyToClipboard('<?php echo $session['attendance_code']; ?>')">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="session-timer" data-end="<?php echo $session['end_time']; ?>">
                                        <i class="fas fa-clock"></i> <span class="timer-display">--:--</span>
                                    </div>
                                    <form action="../api/teacher/attendance.php" method="POST" style="display:inline;">
                                        <input type="hidden" name="action" value="close">
                                        <input type="hidden" name="session_id" value="<?php echo $session['id']; ?>">
                                        <button type="submit" class="btn btn-danger btn-sm">Close Session</button>
                                    </form>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Courses Grid -->
                <div class="section-header" style="margin-top: 32px;">
                    <h2>My Courses</h2>
                </div>

                <div class="courses-grid">
                    <?php foreach ($courses as $course): ?>
                        <div class="course-card animate-fade-in"
                            style="border-top: 4px solid <?php echo $course['cover_color']; ?>;">
                            <div class="course-header"
                                style="background: linear-gradient(135deg, <?php echo $course['cover_color']; ?>20, transparent);">
                                <h3><?php echo sanitize($course['course_code']); ?></h3>
                                <p><?php echo sanitize($course['course_name']); ?></p>
                                <span class="section-badge"><?php echo sanitize($course['section'] ?? 'Default'); ?></span>
                            </div>
                            <div class="course-stats">
                                <div class="stat"><i class="fas fa-users"></i> <?php echo $course['student_count']; ?>
                                    students</div>
                                <div class="stat"><i class="fas fa-calendar"></i> <?php echo $course['session_count']; ?>
                                    sessions</div>
                            </div>
                            <div class="course-join-code">
                                <span class="label">Join Code:</span>
                                <span class="code"><?php echo $course['join_code']; ?></span>
                                <button class="btn btn-icon btn-ghost btn-sm"
                                    onclick="copyToClipboard('<?php echo $course['join_code']; ?>')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="course-actions">
                                <a href="course.php?id=<?php echo $course['id']; ?>" class="btn btn-ghost btn-sm">View
                                    Details</a>
                                <button class="btn btn-success btn-sm"
                                    onclick="openAttendanceModal(<?php echo $course['id']; ?>, '<?php echo sanitize($course['course_name']); ?>')">
                                    <i class="fas fa-qrcode"></i> Start Attendance
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if (empty($courses)): ?>
                        <div class="empty-state">
                            <i class="fas fa-book-open"></i>
                            <h3>No Courses Yet</h3>
                            <p>Create your first course to get started</p>
                            <button class="btn btn-primary" onclick="openModal('createCourseModal')">
                                <i class="fas fa-plus"></i> Create Course
                            </button>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </main>
    </div>

    <!-- Create Course Modal -->
    <div class="modal-overlay" id="createCourseModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Create New Course</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('createCourseModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/courses.php" method="POST">
                <input type="hidden" name="action" value="create">
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">Course Code</label><input type="text"
                            name="course_code" class="form-input" placeholder="e.g., CS101" required></div>
                    <div class="form-group"><label class="form-label">Course Name</label><input type="text"
                            name="course_name" class="form-input" placeholder="e.g., Introduction to Programming"
                            required></div>
                    <div class="form-group"><label class="form-label">Description</label><textarea name="description"
                            class="form-input" rows="3"></textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Section</label><input type="text"
                                name="section" class="form-input" placeholder="e.g., Section A"></div>
                        <div class="form-group"><label class="form-label">Room</label><input type="text" name="room"
                                class="form-input" placeholder="e.g., Room 301"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Schedule</label><input type="text" name="schedule"
                            class="form-input" placeholder="e.g., MWF 9:00 AM - 10:30 AM"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost"
                        onclick="closeModal('createCourseModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Course</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Start Attendance Modal -->
    <div class="modal-overlay" id="attendanceModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Start Attendance Session</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('attendanceModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/attendance.php" method="POST">
                <input type="hidden" name="action" value="create">
                <input type="hidden" name="course_id" id="attendance_course_id">
                <div class="modal-body">
                    <p class="text-muted" style="margin-bottom: 20px;">Course: <strong
                            id="attendance_course_name"></strong></p>
                    <div class="form-group"><label class="form-label">Session Title (Optional)</label><input type="text"
                            name="session_title" class="form-input" placeholder="e.g., Week 1 - Lecture"></div>
                    <div class="form-group">
                        <label class="form-label">Duration (Minutes)</label>
                        <select name="duration" class="form-input">
                            <option value="5">5 minutes</option>
                            <option value="10" selected>10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" name="allow_late" value="1" checked>
                            <span>Allow late submissions (marked as 'Late')</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('attendanceModal')">Cancel</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-play"></i> Start Session</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        function openAttendanceModal(courseId, courseName) {
            document.getElementById('attendance_course_id').value = courseId;
            document.getElementById('attendance_course_name').textContent = courseName;
            openModal('attendanceModal');
        }

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