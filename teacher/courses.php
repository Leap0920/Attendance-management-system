<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Get teacher's courses with stats
$stmt = $db->prepare("SELECT c.*, 
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = c.id) as session_count,
    (SELECT COUNT(*) FROM course_materials WHERE course_id = c.id) as material_count
    FROM courses c 
    WHERE c.teacher_id = ? 
    ORDER BY c.status ASC, c.created_at DESC");
$stmt->execute([$user['id']]);
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
                        <h1>My Courses</h1>
                        <p class="text-muted">Manage your teaching courses</p>
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

                <!-- Course Stats Summary -->
                <div class="stats-grid" style="margin-bottom: 32px;">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i
                                class="fas fa-book"></i></div>
                        <div class="stat-value">
                            <?php echo count(array_filter($courses, fn($c) => $c['status'] === 'active')); ?></div>
                        <div class="stat-label">Active Courses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i
                                class="fas fa-users"></i></div>
                        <div class="stat-value"><?php echo array_sum(array_column($courses, 'student_count')); ?></div>
                        <div class="stat-label">Total Students</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(156, 39, 176, 0.2); color: var(--purple);"><i
                                class="fas fa-calendar-check"></i></div>
                        <div class="stat-value"><?php echo array_sum(array_column($courses, 'session_count')); ?></div>
                        <div class="stat-label">Total Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);"><i
                                class="fas fa-file-alt"></i></div>
                        <div class="stat-value"><?php echo array_sum(array_column($courses, 'material_count')); ?></div>
                        <div class="stat-label">Total Materials</div>
                    </div>
                </div>

                <!-- Courses Grid -->
                <div class="courses-grid">
                    <?php foreach ($courses as $course): ?>
                        <div class="course-card animate-fade-in <?php echo $course['status'] !== 'active' ? 'archived' : ''; ?>"
                            style="border-top: 4px solid <?php echo $course['cover_color']; ?>;">
                            <div class="course-header"
                                style="background: linear-gradient(135deg, <?php echo $course['cover_color']; ?>20, transparent);">
                                <div class="course-title-row">
                                    <h3><?php echo sanitize($course['course_code']); ?></h3>
                                    <?php if ($course['status'] !== 'active'): ?>
                                        <span class="badge badge-warning"><?php echo ucfirst($course['status']); ?></span>
                                    <?php endif; ?>
                                </div>
                                <p><?php echo sanitize($course['course_name']); ?></p>
                                <?php if ($course['section']): ?>
                                    <span class="section-badge"><?php echo sanitize($course['section']); ?></span>
                                <?php endif; ?>
                            </div>

                            <div class="course-stats">
                                <div class="stat"><i class="fas fa-users"></i> <?php echo $course['student_count']; ?>
                                    students</div>
                                <div class="stat"><i class="fas fa-calendar"></i> <?php echo $course['session_count']; ?>
                                    sessions</div>
                                <div class="stat"><i class="fas fa-file"></i> <?php echo $course['material_count']; ?>
                                    materials</div>
                            </div>

                            <div class="course-join-code">
                                <span class="label">Join Code:</span>
                                <span class="code"><?php echo $course['join_code']; ?></span>
                                <button class="btn btn-icon btn-ghost btn-sm"
                                    onclick="copyToClipboard('<?php echo $course['join_code']; ?>')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>

                            <?php if ($course['schedule'] || $course['room']): ?>
                                <div class="course-details"
                                    style="padding: 12px 24px; border-top: 1px solid var(--border-color); font-size: 13px; color: var(--text-secondary);">
                                    <?php if ($course['schedule']): ?>
                                        <div><i class="fas fa-clock"></i> <?php echo sanitize($course['schedule']); ?></div>
                                    <?php endif; ?>
                                    <?php if ($course['room']): ?>
                                        <div><i class="fas fa-door-open"></i> <?php echo sanitize($course['room']); ?></div>
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>

                            <div class="course-actions">
                                <a href="course.php?id=<?php echo $course['id']; ?>" class="btn btn-ghost btn-sm">
                                    <i class="fas fa-eye"></i> View
                                </a>
                                <button class="btn btn-ghost btn-sm"
                                    onclick="editCourse(<?php echo htmlspecialchars(json_encode($course)); ?>)">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-success btn-sm"
                                    onclick="openQuickAttendance(<?php echo $course['id']; ?>, '<?php echo addslashes($course['course_name']); ?>')">
                                    <i class="fas fa-qrcode"></i> Attendance
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
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Course Code *</label>
                            <input type="text" name="course_code" class="form-input" placeholder="e.g., CS101" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Section</label>
                            <input type="text" name="section" class="form-input" placeholder="e.g., Section A">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Course Name *</label>
                        <input type="text" name="course_name" class="form-input"
                            placeholder="e.g., Introduction to Programming" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-input" rows="3"
                            placeholder="Brief description of the course..."></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Schedule</label>
                            <input type="text" name="schedule" class="form-input"
                                placeholder="e.g., MWF 9:00 AM - 10:30 AM">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Room</label>
                            <input type="text" name="room" class="form-input" placeholder="e.g., Room 301">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost"
                        onclick="closeModal('createCourseModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Course</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Course Modal -->
    <div class="modal-overlay" id="editCourseModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Course</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('editCourseModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/courses.php" method="POST">
                <input type="hidden" name="action" value="update">
                <input type="hidden" name="id" id="edit_course_id">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Course Code *</label>
                            <input type="text" name="course_code" id="edit_course_code" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Section</label>
                            <input type="text" name="section" id="edit_section" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Course Name *</label>
                        <input type="text" name="course_name" id="edit_course_name" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea name="description" id="edit_description" class="form-input" rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Schedule</label>
                            <input type="text" name="schedule" id="edit_schedule" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Room</label>
                            <input type="text" name="room" id="edit_room" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select name="status" id="edit_status" class="form-input">
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" onclick="deleteCourse()"
                        style="margin-right: auto;">Delete Course</button>
                    <button type="button" class="btn btn-ghost" onclick="closeModal('editCourseModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Quick Attendance Modal -->
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
                    <div class="form-group">
                        <label class="form-label">Session Title (Optional)</label>
                        <input type="text" name="session_title" class="form-input" placeholder="e.g., Week 1 - Lecture">
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
                    <button type="button" class="btn btn-ghost" onclick="closeModal('attendanceModal')">Cancel</button>
                    <button type="submit" class="btn btn-success"><i class="fas fa-play"></i> Start Session</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        let currentEditCourseId = null;

        function editCourse(course) {
            currentEditCourseId = course.id;
            document.getElementById('edit_course_id').value = course.id;
            document.getElementById('edit_course_code').value = course.course_code;
            document.getElementById('edit_course_name').value = course.course_name;
            document.getElementById('edit_section').value = course.section || '';
            document.getElementById('edit_description').value = course.description || '';
            document.getElementById('edit_schedule').value = course.schedule || '';
            document.getElementById('edit_room').value = course.room || '';
            document.getElementById('edit_status').value = course.status;
            openModal('editCourseModal');
        }

        function deleteCourse() {
            if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '../api/teacher/courses.php';
                form.innerHTML = `<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${currentEditCourseId}">`;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function openQuickAttendance(courseId, courseName) {
            document.getElementById('attendance_course_id').value = courseId;
            document.getElementById('attendance_course_name').textContent = courseName;
            openModal('attendanceModal');
        }
    </script>
    <style>
        .course-card.archived {
            opacity: 0.7;
        }

        .course-card.archived .course-header {
            background: rgba(100, 100, 100, 0.1) !important;
        }

        .course-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .course-details div {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }

        .course-details div i {
            width: 14px;
        }
    </style>
</body>

</html>