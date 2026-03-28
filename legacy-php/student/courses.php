<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

// Get enrolled courses with details
$stmt = $db->prepare("SELECT c.*, u.first_name as teacher_first, u.last_name as teacher_last, u.email as teacher_email,
    e.enrolled_at,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = c.id) as total_sessions,
    (SELECT COUNT(*) FROM attendance_records WHERE course_id = c.id AND student_id = ? AND status IN ('present','late')) as attended
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON c.teacher_id = u.id
    WHERE e.student_id = ? AND e.status = 'active' AND c.status = 'active'
    ORDER BY c.course_name");
$stmt->execute([$user['id'], $user['id']]);
$courses = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Courses - AttendEase</title>
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
                        <h1>My Courses</h1>
                        <p class="text-muted">View your enrolled courses</p>
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

                <div class="courses-grid">
                    <?php foreach ($courses as $course):
                        $rate = $course['total_sessions'] > 0 ? round(($course['attended'] / $course['total_sessions']) * 100, 1) : 100;
                        ?>
                        <div class="course-card animate-fade-in" data-course-id="<?php echo $course['id']; ?>"
                            style="border-top: 4px solid <?php echo $course['cover_color']; ?>; cursor: pointer;">
                            <div class="course-header"
                                style="background: linear-gradient(135deg, <?php echo $course['cover_color']; ?>20, transparent);">
                                <h3><?php echo sanitize($course['course_code']); ?></h3>
                                <p><?php echo sanitize($course['course_name']); ?></p>
                                <?php if ($course['section']): ?>
                                    <span class="section-badge"><?php echo sanitize($course['section']); ?></span>
                                <?php endif; ?>
                            </div>

                            <div class="course-details"
                                style="padding: 16px 24px; border-top: 1px solid var(--border-color);">
                                <div class="detail-item"><i class="fas fa-user"></i>
                                    <?php echo sanitize($course['teacher_first'] . ' ' . $course['teacher_last']); ?></div>
                                <?php if ($course['schedule']): ?>
                                    <div class="detail-item"><i class="fas fa-clock"></i>
                                        <?php echo sanitize($course['schedule']); ?></div>
                                <?php endif; ?>
                                <?php if ($course['room']): ?>
                                    <div class="detail-item"><i class="fas fa-door-open"></i>
                                        <?php echo sanitize($course['room']); ?></div>
                                <?php endif; ?>
                                <div class="detail-item"><i class="fas fa-users"></i>
                                    <?php echo $course['student_count']; ?> students</div>
                            </div>

                            <div class="course-attendance-summary">
                                <div class="attendance-bar">
                                    <div class="attendance-fill"
                                        style="width: <?php echo $rate; ?>%; background: <?php echo $rate >= 75 ? 'var(--success)' : ($rate >= 50 ? 'var(--warning)' : 'var(--danger)'); ?>;">
                                    </div>
                                </div>
                                <div class="attendance-text">
                                    <span>Attendance:
                                        <?php echo $course['attended']; ?>/<?php echo $course['total_sessions']; ?></span>
                                    <span class="rate"><?php echo $rate; ?>%</span>
                                </div>
                            </div>

                            <div class="course-actions">
                                <span class="text-muted" style="font-size:12px;">Joined
                                    <?php echo formatDate($course['enrolled_at']); ?></span>
                                <form action="../api/student/courses.php" method="POST" style="margin-left:auto;"
                                    onsubmit="return confirm('Leave this course?');">
                                    <input type="hidden" name="action" value="leave">
                                    <input type="hidden" name="course_id" value="<?php echo $course['id']; ?>">
                                    <button type="submit" class="btn btn-ghost btn-sm text-danger">Leave</button>
                                </form>
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
                        <input type="text" name="join_code" class="form-input" placeholder="e.g., ABC123" maxlength="10"
                            required
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

    <script src="../assets/js/dashboard.js"></script>
    <style>
        .course-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .detail-item {
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .detail-item i {
            width: 16px;
            color: var(--text-muted);
        }
    </style>
</body>

</html>