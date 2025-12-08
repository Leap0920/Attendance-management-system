<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

$courseId = $_GET['id'] ?? 0;

if (!$courseId) {
    redirect('courses.php', 'error', 'Invalid course');
}

// Get course details and verify enrollment
$stmt = $db->prepare("SELECT c.*, u.first_name as teacher_first, u.last_name as teacher_last, 
    u.email as teacher_email, e.enrolled_at,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = c.id) as total_sessions,
    (SELECT COUNT(*) FROM attendance_records WHERE course_id = c.id AND student_id = ? AND status IN ('present','late')) as attended
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.teacher_id = u.id
    WHERE c.id = ? AND e.student_id = ? AND e.status = 'active'");
$stmt->execute([$user['id'], $courseId, $user['id']]);
$course = $stmt->fetch();

if (!$course) {
    redirect('courses.php', 'error', 'Course not found or you are not enrolled');
}

$attendanceRate = $course['total_sessions'] > 0
    ? round(($course['attended'] / $course['total_sessions']) * 100, 1) : 100;

// Get attendance history for this course
$stmt = $db->prepare("SELECT ar.*, ats.session_title, ats.start_time
    FROM attendance_records ar
    JOIN attendance_sessions ats ON ar.session_id = ats.id
    WHERE ar.course_id = ? AND ar.student_id = ?
    ORDER BY ar.submitted_at DESC");
$stmt->execute([$courseId, $user['id']]);
$attendanceHistory = $stmt->fetchAll();

// Get course materials
$stmt = $db->prepare("SELECT * FROM course_materials WHERE course_id = ? ORDER BY is_pinned DESC, created_at DESC");
$stmt->execute([$courseId]);
$materials = $stmt->fetchAll();

// Active attendance session check
$stmt = $db->prepare("SELECT ats.* FROM attendance_sessions ats
    WHERE ats.course_id = ? AND ats.status = 'active' AND ats.end_time > NOW()
    AND ats.id NOT IN (SELECT session_id FROM attendance_records WHERE student_id = ?)");
$stmt->execute([$courseId, $user['id']]);
$activeSession = $stmt->fetch();

// Get group chat messages
$stmt = $db->prepare("SELECT cm.*, u.first_name, u.last_name, u.role
    FROM course_messages cm
    JOIN users u ON cm.sender_id = u.id
    WHERE cm.course_id = ?
    ORDER BY cm.created_at DESC");
$stmt->execute([$courseId]);
$recentMessages = array_reverse($stmt->fetchAll());

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo sanitize($course['course_code']); ?> - AttendEase</title>
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
                <!-- Course Header -->
                <div class="course-detail-header"
                    style="background: linear-gradient(135deg, <?php echo $course['cover_color']; ?>30, transparent); border-left: 4px solid <?php echo $course['cover_color']; ?>;">
                    <div class="course-info">
                        <a href="courses.php" class="btn btn-ghost btn-sm" style="margin-bottom: 12px;">
                            <i class="fas fa-arrow-left"></i> Back to Courses
                        </a>
                        <h1><?php echo sanitize($course['course_code']); ?></h1>
                        <h2><?php echo sanitize($course['course_name']); ?></h2>
                        <?php if ($course['section']): ?>
                            <span class="badge badge-primary"><?php echo sanitize($course['section']); ?></span>
                        <?php endif; ?>
                    </div>
                    <div class="course-meta">
                        <div class="meta-item"><i class="fas fa-user"></i>
                            <?php echo sanitize($course['teacher_first'] . ' ' . $course['teacher_last']); ?></div>
                        <?php if ($course['schedule']): ?>
                            <div class="meta-item"><i class="fas fa-clock"></i> <?php echo sanitize($course['schedule']); ?>
                            </div>
                        <?php endif; ?>
                        <?php if ($course['room']): ?>
                            <div class="meta-item"><i class="fas fa-door-open"></i> <?php echo sanitize($course['room']); ?>
                            </div>
                        <?php endif; ?>
                        <div class="meta-item"><i class="fas fa-users"></i> <?php echo $course['student_count']; ?>
                            students</div>
                    </div>
                </div>

                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <!-- Active Attendance Alert -->
                <?php if ($activeSession): ?>
                    <div class="active-attendance-alert animate-fade-in" style="margin-top: 20px;">
                        <div class="alert-icon"><i class="fas fa-bell"></i></div>
                        <div class="alert-content">
                            <h3>Attendance Open!</h3>
                            <p><?php echo sanitize($activeSession['session_title'] ?? 'Attendance session'); ?> is waiting
                                for your submission.</p>
                        </div>
                        <button class="btn btn-success" onclick="openModal('submitAttendanceModal')">
                            <i class="fas fa-check"></i> Submit Attendance
                        </button>
                    </div>
                <?php endif; ?>

                <div class="course-content-grid">
                    <!-- Attendance Stats -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-chart-pie"></i> My Attendance</h3>
                        </div>
                        <div class="card-body">
                            <div class="attendance-stat-circle" style="--rate: <?php echo $attendanceRate; ?>%;">
                                <div class="circle-value"><?php echo $attendanceRate; ?>%</div>
                                <div class="circle-label">Attendance Rate</div>
                            </div>
                            <div class="attendance-breakdown">
                                <div class="breakdown-item">
                                    <span class="breakdown-label">Sessions Attended</span>
                                    <span class="breakdown-value text-success"><?php echo $course['attended']; ?></span>
                                </div>
                                <div class="breakdown-item">
                                    <span class="breakdown-label">Total Sessions</span>
                                    <span class="breakdown-value"><?php echo $course['total_sessions']; ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance History -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-history"></i> Attendance History</h3>
                            <a href="attendance.php?course=<?php echo $courseId; ?>" class="btn btn-ghost btn-sm">View
                                All</a>
                        </div>
                        <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                            <?php foreach ($attendanceHistory as $record): ?>
                                <div class="history-item">
                                    <div class="history-info">
                                        <div class="history-title">
                                            <?php echo sanitize($record['session_title'] ?? 'Session'); ?></div>
                                        <div class="history-date"><?php echo formatDateTime($record['submitted_at']); ?>
                                        </div>
                                    </div>
                                    <span
                                        class="badge badge-<?php echo $record['status'] === 'present' ? 'success' : ($record['status'] === 'late' ? 'warning' : 'danger'); ?>">
                                        <?php echo ucfirst($record['status']); ?>
                                    </span>
                                </div>
                            <?php endforeach; ?>
                            <?php if (empty($attendanceHistory)): ?>
                                <p class="text-muted text-center">No attendance records yet</p>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Recent Materials -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-file-alt"></i> Recent Materials</h3>
                            <a href="materials.php?course=<?php echo $courseId; ?>" class="btn btn-ghost btn-sm">View
                                All</a>
                        </div>
                        <div class="card-body">
                            <?php foreach ($materials as $m): ?>
                                <div class="material-item">
                                    <i
                                        class="fas fa-<?php echo $m['type'] === 'file' ? 'file-alt' : ($m['type'] === 'link' ? 'link' : 'bullhorn'); ?>"></i>
                                    <div class="material-info">
                                        <div class="material-title"><?php echo sanitize($m['title']); ?></div>
                                        <div class="material-date"><?php echo timeAgo($m['created_at']); ?></div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                            <?php if (empty($materials)): ?>
                                <p class="text-muted text-center">No materials yet</p>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Group Chat Preview -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-comments"></i> Course Chat</h3>
                            <a href="messages.php?mode=group&course=<?php echo $courseId; ?>"
                                class="btn btn-ghost btn-sm">Open Chat</a>
                        </div>
                        <div class="card-body chat-preview" style="max-height: 250px; overflow-y: auto;">
                            <?php foreach ($recentMessages as $msg): ?>
                                <div class="chat-message-preview">
                                    <strong><?php echo sanitize($msg['first_name']); ?></strong>
                                    <span
                                        class="badge badge-<?php echo $msg['role'] === 'teacher' ? 'primary' : 'secondary'; ?>"
                                        style="font-size: 10px;"><?php echo ucfirst($msg['role']); ?></span>
                                    <p><?php echo sanitize(substr($msg['content'], 0, 100)); ?><?php echo strlen($msg['content']) > 100 ? '...' : ''; ?>
                                    </p>
                                </div>
                            <?php endforeach; ?>
                            <?php if (empty($recentMessages)): ?>
                                <p class="text-muted text-center">No messages yet. Start a conversation!</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                <?php if ($course['description']): ?>
                    <div class="card" style="margin-top: 24px;">
                        <div class="card-header">
                            <h3><i class="fas fa-info-circle"></i> About This Course</h3>
                        </div>
                        <div class="card-body">
                            <p><?php echo nl2br(sanitize($course['description'])); ?></p>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </main>
    </div>

    <!-- Submit Attendance Modal -->
    <?php if ($activeSession): ?>
        <div class="modal-overlay" id="submitAttendanceModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Submit Attendance</h3>
                    <button class="btn btn-icon btn-ghost" onclick="closeModal('submitAttendanceModal')"><i
                            class="fas fa-times"></i></button>
                </div>
                <form action="../api/student/attendance.php" method="POST">
                    <input type="hidden" name="action" value="submit">
                    <input type="hidden" name="session_id" value="<?php echo $activeSession['id']; ?>">
                    <div class="modal-body">
                        <p><strong><?php echo sanitize($activeSession['session_title'] ?? 'Attendance'); ?></strong></p>
                        <p class="text-muted">Ends: <?php echo formatDateTime($activeSession['end_time']); ?></p>
                        <div class="form-group" style="margin-top: 16px;">
                            <label class="form-label">Attendance Code</label>
                            <input type="text" name="attendance_code" class="form-input" placeholder="Enter code"
                                maxlength="10" required
                                style="text-transform: uppercase; letter-spacing: 4px; font-size: 24px; text-align: center;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-ghost"
                            onclick="closeModal('submitAttendanceModal')">Cancel</button>
                        <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Submit</button>
                    </div>
                </form>
            </div>
        </div>
    <?php endif; ?>

    <script src="../assets/js/dashboard.js"></script>
    <style>
        .course-detail-header {
            padding: 24px;
            border-radius: var(--radius);
            margin-bottom: 24px;
        }

        .course-detail-header h1 {
            font-size: 28px;
            margin-bottom: 4px;
        }

        .course-detail-header h2 {
            font-size: 16px;
            font-weight: 400;
            color: var(--text-secondary);
            margin-bottom: 12px;
        }

        .course-meta {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            margin-top: 16px;
        }

        .meta-item {
            font-size: 14px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .meta-item i {
            color: var(--text-muted);
        }

        .course-content-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
        }

        .attendance-stat-circle {
            text-align: center;
            padding: 24px;
        }

        .circle-value {
            font-size: 48px;
            font-weight: 700;
            color: var(--primary);
        }

        .circle-label {
            font-size: 14px;
            color: var(--text-muted);
        }

        .attendance-breakdown {
            display: flex;
            justify-content: space-around;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid var(--border-color);
        }

        .breakdown-item {
            text-align: center;
        }

        .breakdown-label {
            display: block;
            font-size: 12px;
            color: var(--text-muted);
        }

        .breakdown-value {
            font-size: 24px;
            font-weight: 600;
        }

        .history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .history-title {
            font-weight: 500;
        }

        .history-date {
            font-size: 12px;
            color: var(--text-muted);
        }

        .material-item {
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .material-item i {
            color: var(--primary);
        }

        .material-title {
            font-weight: 500;
            font-size: 14px;
        }

        .material-date {
            font-size: 12px;
            color: var(--text-muted);
        }

        .chat-message-preview {
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .chat-message-preview p {
            margin: 4px 0 0;
            font-size: 13px;
            color: var(--text-secondary);
        }

        .active-attendance-alert {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 24px;
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
            border: 1px solid rgba(52, 168, 83, 0.3);
            border-radius: var(--radius);
        }

        .alert-icon {
            font-size: 24px;
            color: var(--success);
        }

        .alert-content {
            flex: 1;
        }

        .alert-content h3 {
            margin: 0;
            font-size: 16px;
        }

        .alert-content p {
            margin: 4px 0 0;
            font-size: 13px;
            color: var(--text-secondary);
        }

        @media (max-width: 992px) {
            .course-content-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</body>

</html>