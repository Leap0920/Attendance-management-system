<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Get all courses with teacher info
$stmt = $db->query("SELECT c.*, u.first_name, u.last_name, u.email as teacher_email,
    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
    (SELECT COUNT(*) FROM attendance_sessions WHERE course_id = c.id) as session_count
    FROM courses c
    JOIN users u ON c.teacher_id = u.id
    WHERE c.status != 'deleted'
    ORDER BY c.created_at DESC");
$courses = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Course Management - AttendEase</title>
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
                        <h1>Course Management</h1>
                        <p class="text-muted">View and manage all courses</p>
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
                                    <th>Teacher</th>
                                    <th>Join Code</th>
                                    <th>Students</th>
                                    <th>Sessions</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($courses as $c): ?>
                                    <tr>
                                        <td>
                                            <div>
                                                <strong><?php echo sanitize($c['course_code']); ?></strong>
                                                <div class="text-muted" style="font-size:13px;">
                                                    <?php echo sanitize($c['course_name']); ?></div>
                                            </div>
                                        </td>
                                        <td><?php echo sanitize($c['first_name'] . ' ' . $c['last_name']); ?></td>
                                        <td><code
                                                style="background:var(--bg-card);padding:4px 8px;border-radius:4px;"><?php echo $c['join_code']; ?></code>
                                        </td>
                                        <td><?php echo $c['student_count']; ?></td>
                                        <td><?php echo $c['session_count']; ?></td>
                                        <td><span
                                                class="badge badge-<?php echo $c['status'] === 'active' ? 'success' : 'warning'; ?>"><?php echo ucfirst($c['status']); ?></span>
                                        </td>
                                        <td class="text-muted"><?php echo formatDate($c['created_at']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($courses)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center text-muted">No courses found</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>
    <script src="../assets/js/dashboard.js"></script>
</body>

</html>