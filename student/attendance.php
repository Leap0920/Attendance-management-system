<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

// Get all attendance records with course info
$stmt = $db->prepare("SELECT ar.*, c.course_code, c.course_name, ats.session_title, ats.created_at as session_date
    FROM attendance_records ar
    JOIN courses c ON ar.course_id = c.id
    JOIN attendance_sessions ats ON ar.session_id = ats.id
    WHERE ar.student_id = ?
    ORDER BY ar.submitted_at DESC");
$stmt->execute([$user['id']]);
$records = $stmt->fetchAll();

// Get summary stats
$stats = ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0];
foreach ($records as $r) {
    $stats[$r['status']]++;
}
$total = array_sum($stats);
$attendedRate = $total > 0 ? round((($stats['present'] + $stats['late']) / $total) * 100, 1) : 0;
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Attendance - AttendEase</title>
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
                        <h1>My Attendance</h1>
                        <p class="text-muted">View your attendance records</p>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="stats-grid">
                    <div class="stat-card animate-fade-in">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i
                                class="fas fa-check-circle"></i></div>
                        <div class="stat-value"><?php echo $stats['present']; ?></div>
                        <div class="stat-label">Present</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.1s">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);"><i
                                class="fas fa-clock"></i></div>
                        <div class="stat-value"><?php echo $stats['late']; ?></div>
                        <div class="stat-label">Late</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.2s">
                        <div class="stat-icon" style="background: rgba(234, 67, 53, 0.2); color: var(--danger);"><i
                                class="fas fa-times-circle"></i></div>
                        <div class="stat-value"><?php echo $stats['absent']; ?></div>
                        <div class="stat-label">Absent</div>
                    </div>
                    <div class="stat-card animate-fade-in" style="animation-delay: 0.3s">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i
                                class="fas fa-chart-pie"></i></div>
                        <div class="stat-value"><?php echo $attendedRate; ?>%</div>
                        <div class="stat-label">Attendance Rate</div>
                    </div>
                </div>

                <!-- Records Table -->
                <div class="card animate-fade-in" style="margin-top: 32px;">
                    <div class="card-header">
                        <h3><i class="fas fa-history"></i> Attendance History</h3>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Session</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($records as $r): ?>
                                    <tr>
                                        <td>
                                            <strong><?php echo sanitize($r['course_code']); ?></strong>
                                            <div class="text-muted" style="font-size:13px;">
                                                <?php echo sanitize($r['course_name']); ?></div>
                                        </td>
                                        <td><?php echo sanitize($r['session_title'] ?? 'Session'); ?></td>
                                        <td>
                                            <span
                                                class="badge badge-<?php echo ['present' => 'success', 'late' => 'warning', 'absent' => 'danger', 'excused' => 'primary'][$r['status']]; ?>">
                                                <i
                                                    class="fas fa-<?php echo ['present' => 'check', 'late' => 'clock', 'absent' => 'times', 'excused' => 'info'][$r['status']]; ?>"></i>
                                                <?php echo ucfirst($r['status']); ?>
                                            </span>
                                        </td>
                                        <td class="text-muted"><?php echo formatDateTime($r['submitted_at']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($records)): ?>
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
    <script src="../assets/js/dashboard.js"></script>
</body>

</html>