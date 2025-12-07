<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Date range
$dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
$dateTo = $_GET['date_to'] ?? date('Y-m-d');

// System Statistics
$stats = [];

// Users stats
$stmt = $db->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
$usersByRole = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
$stats['total_users'] = array_sum($usersByRole);
$stats['admins'] = $usersByRole['admin'] ?? 0;
$stats['teachers'] = $usersByRole['teacher'] ?? 0;
$stats['students'] = $usersByRole['student'] ?? 0;

// Courses stats
$stmt = $db->query("SELECT status, COUNT(*) as count FROM courses GROUP BY status");
$coursesByStatus = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
$stats['total_courses'] = array_sum($coursesByStatus);
$stats['active_courses'] = $coursesByStatus['active'] ?? 0;

// Enrollments
$stats['total_enrollments'] = $db->query("SELECT COUNT(*) FROM enrollments WHERE status = 'active'")->fetchColumn();

// Attendance stats for date range
$stmt = $db->prepare("SELECT COUNT(*) FROM attendance_sessions WHERE DATE(created_at) BETWEEN ? AND ?");
$stmt->execute([$dateFrom, $dateTo]);
$stats['sessions_in_range'] = $stmt->fetchColumn();

// Fixed: Use ar.status to avoid ambiguous column
$stmt = $db->prepare("SELECT ar.status, COUNT(*) as count FROM attendance_records ar
    JOIN attendance_sessions ats ON ar.session_id = ats.id
    WHERE DATE(ats.created_at) BETWEEN ? AND ?
    GROUP BY ar.status");
$stmt->execute([$dateFrom, $dateTo]);
$attendanceByStatus = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
$stats['present'] = $attendanceByStatus['present'] ?? 0;
$stats['late'] = $attendanceByStatus['late'] ?? 0;
$stats['absent'] = $attendanceByStatus['absent'] ?? 0;

// Top courses by enrollment
$stmt = $db->query("SELECT c.course_code, c.course_name, COUNT(e.id) as enrollment_count
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
    GROUP BY c.id
    ORDER BY enrollment_count DESC
    LIMIT 10");
$topCourses = $stmt->fetchAll();

// Top teachers by students
$stmt = $db->query("SELECT u.first_name, u.last_name, COUNT(DISTINCT e.student_id) as student_count
    FROM users u
    JOIN courses c ON u.id = c.teacher_id
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
    WHERE u.role = 'teacher'
    GROUP BY u.id
    ORDER BY student_count DESC
    LIMIT 10");
$topTeachers = $stmt->fetchAll();

// Recent activity
$stmt = $db->prepare("SELECT action, entity_type, al.created_at, u.first_name, u.last_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 20");
$stmt->execute();
$recentActivity = $stmt->fetchAll();

// Monthly attendance trend (last 6 months)
$stmt = $db->query("SELECT DATE_FORMAT(ats.created_at, '%Y-%m') as month,
    SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
    SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
    SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent
    FROM attendance_sessions ats
    LEFT JOIN attendance_records ar ON ats.id = ar.session_id
    WHERE ats.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY month
    ORDER BY month");
$monthlyTrend = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Reports - AttendEase Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard-layout">
        <?php include 'includes/sidebar.php'; ?>
        
        <main class="main-content">
            <?php include 'includes/header.php'; ?>
            
            <div class="content-wrapper">
                <div class="page-header">
                    <div>
                        <h1>System Reports</h1>
                        <p class="text-muted">Comprehensive analytics and statistics</p>
                    </div>
                    <div class="header-actions">
                        <form method="GET" class="date-filter">
                            <input type="date" name="date_from" value="<?php echo $dateFrom; ?>" class="form-input">
                            <span class="text-muted">to</span>
                            <input type="date" name="date_to" value="<?php echo $dateTo; ?>" class="form-input">
                            <button type="submit" class="btn btn-primary"><i class="fas fa-filter"></i></button>
                        </form>
                    </div>
                </div>

                <!-- Overview Stats -->
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i class="fas fa-users"></i></div>
                        <div class="stat-value"><?php echo $stats['total_users']; ?></div>
                        <div class="stat-label">Total Users</div>
                        <div class="stat-breakdown">
                            <span><?php echo $stats['teachers']; ?> teachers</span> •
                            <span><?php echo $stats['students']; ?> students</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i class="fas fa-book"></i></div>
                        <div class="stat-value"><?php echo $stats['total_courses']; ?></div>
                        <div class="stat-label">Total Courses</div>
                        <div class="stat-breakdown"><?php echo $stats['active_courses']; ?> active</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(156, 39, 176, 0.2); color: var(--purple);"><i class="fas fa-user-graduate"></i></div>
                        <div class="stat-value"><?php echo $stats['total_enrollments']; ?></div>
                        <div class="stat-label">Enrollments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);"><i class="fas fa-calendar-check"></i></div>
                        <div class="stat-value"><?php echo $stats['sessions_in_range']; ?></div>
                        <div class="stat-label">Sessions (Period)</div>
                    </div>
                </div>

                <div class="reports-grid">
                    <!-- Attendance Chart -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-chart-pie"></i> Attendance Distribution</h3>
                        </div>
                        <div class="card-body chart-container">
                            <canvas id="attendanceChart"></canvas>
                        </div>
                    </div>

                    <!-- Monthly Trend -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-chart-line"></i> Monthly Trend</h3>
                        </div>
                        <div class="card-body chart-container">
                            <canvas id="trendChart"></canvas>
                        </div>
                    </div>

                    <!-- Top Courses -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-trophy"></i> Top Courses</h3>
                        </div>
                        <div class="card-body">
                            <table class="table table-compact">
                                <thead><tr><th>Course</th><th class="text-right">Students</th></tr></thead>
                                <tbody>
                                    <?php foreach ($topCourses as $c): ?>
                                    <tr>
                                        <td><strong><?php echo sanitize($c['course_code']); ?></strong><br>
                                            <small class="text-muted"><?php echo sanitize($c['course_name']); ?></small></td>
                                        <td class="text-right"><span class="badge badge-primary"><?php echo $c['enrollment_count']; ?></span></td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Top Teachers -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-chalkboard-teacher"></i> Top Teachers</h3>
                        </div>
                        <div class="card-body">
                            <table class="table table-compact">
                                <thead><tr><th>Teacher</th><th class="text-right">Students</th></tr></thead>
                                <tbody>
                                    <?php foreach ($topTeachers as $t): ?>
                                    <tr>
                                        <td><?php echo sanitize($t['first_name'] . ' ' . $t['last_name']); ?></td>
                                        <td class="text-right"><span class="badge badge-success"><?php echo $t['student_count']; ?></span></td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="card" style="grid-column: span 2;">
                        <div class="card-header">
                            <h3><i class="fas fa-history"></i> Recent Activity</h3>
                        </div>
                        <div class="card-body">
                            <div class="activity-list">
                                <?php foreach ($recentActivity as $a): ?>
                                <div class="activity-item">
                                    <div class="activity-icon"><i class="fas fa-circle"></i></div>
                                    <div class="activity-content">
                                        <strong><?php echo sanitize(($a['first_name'] ?? 'System') . ' ' . ($a['last_name'] ?? '')); ?></strong>
                                        <span class="activity-action"><?php echo str_replace('_', ' ', $a['action']); ?></span>
                                        <span class="activity-type"><?php echo str_replace('_', ' ', $a['entity_type']); ?></span>
                                    </div>
                                    <div class="activity-time"><?php echo timeAgo($a['created_at']); ?></div>
                                </div>
                                <?php endforeach; ?>
                                <?php if (empty($recentActivity)): ?>
                                <p class="text-muted text-center">No recent activity</p>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    <script src="../assets/js/dashboard.js"></script>
    <script>
        // Attendance Pie Chart
        new Chart(document.getElementById('attendanceChart'), {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Late', 'Absent'],
                datasets: [{
                    data: [<?php echo $stats['present']; ?>, <?php echo $stats['late']; ?>, <?php echo $stats['absent']; ?>],
                    backgroundColor: ['#34A853', '#FBBC04', '#EA4335'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } }
            }
        });

        // Monthly Trend Chart
        new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: {
                labels: <?php echo json_encode(array_column($monthlyTrend, 'month')); ?>,
                datasets: [
                    { label: 'Present', data: <?php echo json_encode(array_column($monthlyTrend, 'present')); ?>, borderColor: '#34A853', tension: 0.3 },
                    { label: 'Late', data: <?php echo json_encode(array_column($monthlyTrend, 'late')); ?>, borderColor: '#FBBC04', tension: 0.3 },
                    { label: 'Absent', data: <?php echo json_encode(array_column($monthlyTrend, 'absent')); ?>, borderColor: '#EA4335', tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } },
                scales: { x: { ticks: { color: '#888' } }, y: { ticks: { color: '#888' } } }
            }
        });
    </script>
    <style>
        .date-filter { display: flex; gap: 8px; align-items: center; }
        .date-filter .form-input { width: auto; }
        .reports-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .chart-container { height: 250px; }
        .stat-breakdown { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
        .table-compact td, .table-compact th { padding: 10px 12px; }
        .activity-list { max-height: 300px; overflow-y: auto; }
        .activity-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-color); }
        .activity-icon { color: var(--primary); font-size: 8px; }
        .activity-content { flex: 1; font-size: 13px; }
        .activity-action { color: var(--text-secondary); }
        .activity-type { background: var(--bg-card); padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 4px; }
        .activity-time { font-size: 11px; color: var(--text-muted); }
        @media (max-width: 992px) { .reports-grid { grid-template-columns: 1fr; } .reports-grid .card[style*="span 2"] { grid-column: span 1; } }
    </style>
</body>
</html>