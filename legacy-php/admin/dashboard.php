<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Get statistics
$stats = [];

// Total users by role
$stmt = $db->query("SELECT role, COUNT(*) as count FROM users WHERE status = 'active' GROUP BY role");
$userCounts = $stmt->fetchAll();
foreach ($userCounts as $row) {
    $stats[$row['role'] . '_count'] = $row['count'];
}

// Total courses
$stmt = $db->query("SELECT COUNT(*) as count FROM courses WHERE status = 'active'");
$stats['course_count'] = $stmt->fetch()['count'];

// Total attendance sessions
$stmt = $db->query("SELECT COUNT(*) as count FROM attendance_sessions");
$stats['session_count'] = $stmt->fetch()['count'];

// Overall attendance rate
$stmt = $db->query("SELECT 
    COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as attended,
    COUNT(*) as total 
    FROM attendance_records");
$attendance = $stmt->fetch();
$stats['attendance_rate'] = $attendance['total'] > 0 ? round(($attendance['attended'] / $attendance['total']) * 100, 1) : 0;

// Recent activity
$stmt = $db->query("SELECT al.*, u.first_name, u.last_name, u.email 
    FROM audit_logs al 
    LEFT JOIN users u ON al.user_id = u.id 
    ORDER BY al.created_at DESC LIMIT 10");
$recentActivity = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - AttendEase</title>
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
                        <h1>Dashboard</h1>
                        <p class="text-muted">Welcome back, <?php echo $user['first_name']; ?>!</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openModal('addUserModal')">
                            <i class="fas fa-plus"></i> Add User
                        </button>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.1s">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="stat-value"><?php echo $stats['admin_count'] ?? 0; ?></div>
                        <div class="stat-label">Administrators</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.2s">
                        <div class="stat-icon" style="background: rgba(156, 39, 176, 0.2); color: var(--purple);">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        <div class="stat-value"><?php echo $stats['teacher_count'] ?? 0; ?></div>
                        <div class="stat-label">Teachers</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.3s">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div class="stat-value"><?php echo $stats['student_count'] ?? 0; ?></div>
                        <div class="stat-label">Students</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.4s">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="stat-value"><?php echo $stats['course_count']; ?></div>
                        <div class="stat-label">Active Courses</div>
                    </div>
                </div>

                <!-- Attendance Overview -->
                <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-top: 24px;">
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.5s">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-value"><?php echo $stats['session_count']; ?></div>
                        <div class="stat-label">Total Sessions</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.6s">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div class="stat-value"><?php echo $stats['attendance_rate']; ?>%</div>
                        <div class="stat-label">Overall Attendance Rate</div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="card animate-fade-in" style="margin-top: 32px; animation-delay: 0.7s">
                    <div class="card-header">
                        <h3><i class="fas fa-history"></i> Recent Activity</h3>
                        <a href="audit-log.php" class="btn btn-ghost btn-sm">View All</a>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($recentActivity as $activity): ?>
                                    <tr>
                                        <td>
                                            <div class="user-info">
                                                <div class="avatar-initials"
                                                    style="width:32px;height:32px;font-size:12px;background:var(--primary);">
                                                    <?php echo $activity['first_name'] ? getInitials($activity['first_name'], $activity['last_name']) : 'SY'; ?>
                                                </div>
                                                <span><?php echo $activity['first_name'] ? $activity['first_name'] . ' ' . $activity['last_name'] : 'System'; ?></span>
                                            </div>
                                        </td>
                                        <td><span
                                                class="badge badge-primary"><?php echo ucfirst($activity['action']); ?></span>
                                        </td>
                                        <td><?php echo ucfirst($activity['entity_type']); ?></td>
                                        <td class="text-muted"><?php echo timeAgo($activity['created_at']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($recentActivity)): ?>
                                    <tr>
                                        <td colspan="4" class="text-center text-muted">No recent activity</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Add User Modal -->
    <div class="modal-overlay" id="addUserModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Add New User</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('addUserModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form action="../api/admin/users.php" method="POST">
                <div class="modal-body">
                    <input type="hidden" name="action" value="create">
                    <div class="form-group">
                        <label class="form-label">First Name</label>
                        <input type="text" name="first_name" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name</label>
                        <input type="text" name="last_name" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" name="password" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role</label>
                        <select name="role" class="form-input">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department</label>
                        <input type="text" name="department" class="form-input">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('addUserModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create User</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
</body>

</html>