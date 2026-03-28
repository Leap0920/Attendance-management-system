<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Filters
$courseFilter = $_GET['course'] ?? '';
$teacherFilter = $_GET['teacher'] ?? '';
$dateFrom = $_GET['date_from'] ?? date('Y-m-d', strtotime('-30 days'));
$dateTo = $_GET['date_to'] ?? date('Y-m-d');

// Get all courses and teachers for filters
$courses = $db->query("SELECT id, course_code, course_name FROM courses ORDER BY course_name")->fetchAll();
$teachers = $db->query("SELECT id, first_name, last_name FROM users WHERE role = 'teacher' ORDER BY last_name")->fetchAll();

// Build attendance sessions query
$query = "SELECT ats.*, c.course_code, c.course_name, u.first_name, u.last_name,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'present') as present_count,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'late') as late_count,
    (SELECT COUNT(*) FROM attendance_records WHERE session_id = ats.id AND status = 'absent') as absent_count
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN users u ON ats.teacher_id = u.id
    WHERE DATE(ats.created_at) BETWEEN ? AND ?";
$params = [$dateFrom, $dateTo];

if ($courseFilter) {
    $query .= " AND ats.course_id = ?";
    $params[] = $courseFilter;
}
if ($teacherFilter) {
    $query .= " AND ats.teacher_id = ?";
    $params[] = $teacherFilter;
}

$query .= " ORDER BY ats.created_at DESC LIMIT 100";

$stmt = $db->prepare($query);
$stmt->execute($params);
$sessions = $stmt->fetchAll();

// Stats
$totalSessions = count($sessions);
$totalPresent = array_sum(array_column($sessions, 'present_count'));
$totalLate = array_sum(array_column($sessions, 'late_count'));
$totalAbsent = array_sum(array_column($sessions, 'absent_count'));

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Overview - AttendEase Admin</title>
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
                        <h1>Attendance Overview</h1>
                        <p class="text-muted">Monitor attendance across all courses</p>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-body">
                        <form method="GET" class="filter-form">
                            <div class="filter-group">
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label">Course</label>
                                    <select name="course" class="form-input">
                                        <option value="">All Courses</option>
                                        <?php foreach ($courses as $c): ?>
                                            <option value="<?php echo $c['id']; ?>" <?php echo $courseFilter == $c['id'] ? 'selected' : ''; ?>>
                                                <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label">Teacher</label>
                                    <select name="teacher" class="form-input">
                                        <option value="">All Teachers</option>
                                        <?php foreach ($teachers as $t): ?>
                                            <option value="<?php echo $t['id']; ?>" <?php echo $teacherFilter == $t['id'] ? 'selected' : ''; ?>>
                                                <?php echo sanitize($t['first_name'] . ' ' . $t['last_name']); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label">From</label>
                                    <input type="date" name="date_from" class="form-input"
                                        value="<?php echo $dateFrom; ?>">
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label">To</label>
                                    <input type="date" name="date_to" class="form-input" value="<?php echo $dateTo; ?>">
                                </div>
                                <button type="submit" class="btn btn-primary" style="align-self: flex-end;"><i
                                        class="fas fa-filter"></i> Filter</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Stats -->
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i
                                class="fas fa-calendar"></i></div>
                        <div class="stat-value"><?php echo $totalSessions; ?></div>
                        <div class="stat-label">Total Sessions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i
                                class="fas fa-check"></i></div>
                        <div class="stat-value"><?php echo $totalPresent; ?></div>
                        <div class="stat-label">Present</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2); color: var(--warning);"><i
                                class="fas fa-clock"></i></div>
                        <div class="stat-value"><?php echo $totalLate; ?></div>
                        <div class="stat-label">Late</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(234, 67, 53, 0.2); color: var(--danger);"><i
                                class="fas fa-times"></i></div>
                        <div class="stat-value"><?php echo $totalAbsent; ?></div>
                        <div class="stat-label">Absent</div>
                    </div>
                </div>

                <!-- Sessions Table -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-list"></i> Attendance Sessions</h3>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Course</th>
                                    <th>Teacher</th>
                                    <th>Session</th>
                                    <th class="text-center">Present</th>
                                    <th class="text-center">Late</th>
                                    <th class="text-center">Absent</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($sessions as $s): ?>
                                    <tr>
                                        <td><?php echo formatDateTime($s['created_at']); ?></td>
                                        <td><strong><?php echo sanitize($s['course_code']); ?></strong></td>
                                        <td><?php echo sanitize($s['first_name'] . ' ' . $s['last_name']); ?></td>
                                        <td><?php echo sanitize($s['session_title'] ?: '-'); ?></td>
                                        <td class="text-center text-success"><?php echo $s['present_count']; ?></td>
                                        <td class="text-center text-warning"><?php echo $s['late_count']; ?></td>
                                        <td class="text-center text-danger"><?php echo $s['absent_count']; ?></td>
                                        <td>
                                            <span
                                                class="badge badge-<?php echo $s['status'] === 'active' ? 'success' : 'secondary'; ?>">
                                                <?php echo ucfirst($s['status']); ?>
                                            </span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($sessions)): ?>
                                    <tr>
                                        <td colspan="8" class="text-center text-muted">No attendance sessions found</td>
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
    <style>
        .filter-form .filter-group {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            align-items: flex-end;
        }

        .filter-form .form-input {
            min-width: 150px;
        }
    </style>
</body>

</html>