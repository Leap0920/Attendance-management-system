<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Get teacher's courses
$stmt = $db->prepare("SELECT id, course_code, course_name FROM courses WHERE teacher_id = ? AND status = 'active'");
$stmt->execute([$user['id']]);
$courses = $stmt->fetchAll();

$selectedCourse = $_GET['course'] ?? null;
$reportData = null;
$students = [];
$sessions = [];

if ($selectedCourse) {
    // Verify ownership
    $stmt = $db->prepare("SELECT * FROM courses WHERE id = ? AND teacher_id = ?");
    $stmt->execute([$selectedCourse, $user['id']]);
    $course = $stmt->fetch();

    if ($course) {
        // Get all students in course
        $stmt = $db->prepare("SELECT u.id, u.first_name, u.last_name, u.student_id, u.email
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            WHERE e.course_id = ? AND e.status = 'active'
            ORDER BY u.last_name, u.first_name");
        $stmt->execute([$selectedCourse]);
        $students = $stmt->fetchAll();

        // Get all sessions
        $stmt = $db->prepare("SELECT id, session_title, created_at FROM attendance_sessions WHERE course_id = ? ORDER BY created_at");
        $stmt->execute([$selectedCourse]);
        $sessions = $stmt->fetchAll();

        // Get attendance records
        $reportData = [];
        foreach ($students as $s) {
            $studentData = [
                'id' => $s['id'],
                'name' => $s['first_name'] . ' ' . $s['last_name'],
                'student_id' => $s['student_id'],
                'email' => $s['email'],
                'sessions' => [],
                'present' => 0,
                'late' => 0,
                'absent' => 0,
                'excused' => 0
            ];

            foreach ($sessions as $sess) {
                $stmt = $db->prepare("SELECT status FROM attendance_records WHERE session_id = ? AND student_id = ?");
                $stmt->execute([$sess['id'], $s['id']]);
                $record = $stmt->fetch();
                $status = $record ? $record['status'] : 'absent';
                $studentData['sessions'][$sess['id']] = $status;
                $studentData[$status]++;
            }

            $total = count($sessions);
            $studentData['rate'] = $total > 0 ? round((($studentData['present'] + $studentData['late']) / $total) * 100, 1) : 100;
            $reportData[] = $studentData;
        }
    }
}

// Export CSV
if (isset($_GET['export']) && $selectedCourse && $reportData) {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="attendance_report_' . $course['course_code'] . '_' . date('Y-m-d') . '.csv"');

    $output = fopen('php://output', 'w');

    // Headers
    $headers = ['Student Name', 'Student ID', 'Email'];
    foreach ($sessions as $sess) {
        $headers[] = $sess['session_title'] ?: formatDate($sess['created_at']);
    }
    $headers = array_merge($headers, ['Present', 'Late', 'Absent', 'Excused', 'Rate %']);
    fputcsv($output, $headers);

    // Data
    foreach ($reportData as $row) {
        $csvRow = [$row['name'], $row['student_id'], $row['email']];
        foreach ($sessions as $sess) {
            $csvRow[] = ucfirst($row['sessions'][$sess['id']] ?? 'absent');
        }
        $csvRow = array_merge($csvRow, [$row['present'], $row['late'], $row['absent'], $row['excused'], $row['rate']]);
        fputcsv($output, $csvRow);
    }

    fclose($output);
    exit;
}

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Reports - AttendEase</title>
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
                        <h1>Attendance Reports</h1>
                        <p class="text-muted">View and export attendance data</p>
                    </div>
                </div>

                <!-- Course Selection -->
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-body">
                        <form method="GET" class="filter-form">
                            <div class="filter-group">
                                <select name="course" class="form-input" onchange="this.form.submit()">
                                    <option value="">Select a course...</option>
                                    <?php foreach ($courses as $c): ?>
                                        <option value="<?php echo $c['id']; ?>" <?php echo $selectedCourse == $c['id'] ? 'selected' : ''; ?>>
                                            <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <?php if ($selectedCourse && $reportData): ?>
                                    <a href="?course=<?php echo $selectedCourse; ?>&export=1" class="btn btn-primary">
                                        <i class="fas fa-download"></i> Export CSV
                                    </a>
                                <?php endif; ?>
                            </div>
                        </form>
                    </div>
                </div>

                <?php if ($selectedCourse && $reportData): ?>
                    <!-- Summary Stats -->
                    <div class="stats-grid" style="margin-bottom: 24px;">
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2); color: var(--primary);"><i
                                    class="fas fa-users"></i></div>
                            <div class="stat-value"><?php echo count($students); ?></div>
                            <div class="stat-label">Total Students</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(156, 39, 176, 0.2); color: var(--purple);"><i
                                    class="fas fa-calendar-check"></i></div>
                            <div class="stat-value"><?php echo count($sessions); ?></div>
                            <div class="stat-label">Total Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2); color: var(--success);"><i
                                    class="fas fa-chart-line"></i></div>
                            <div class="stat-value">
                                <?php
                                $avgRate = count($reportData) > 0 ? round(array_sum(array_column($reportData, 'rate')) / count($reportData), 1) : 0;
                                echo $avgRate;
                                ?>%
                            </div>
                            <div class="stat-label">Average Attendance</div>
                        </div>
                    </div>

                    <!-- Report Table -->
                    <div class="card">
                        <div class="card-header">
                            <h3><i class="fas fa-table"></i> Attendance Report -
                                <?php echo sanitize($course['course_code']); ?></h3>
                        </div>
                        <div class="table-container" style="overflow-x: auto;">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th style="position: sticky; left: 0; background: var(--bg-card); z-index: 1;">
                                            Student</th>
                                        <th>ID</th>
                                        <?php foreach ($sessions as $sess): ?>
                                            <th class="text-center" style="min-width: 80px;">
                                                <small><?php echo sanitize($sess['session_title'] ?: formatDate($sess['created_at'], 'm/d')); ?></small>
                                            </th>
                                        <?php endforeach; ?>
                                        <th class="text-center">P</th>
                                        <th class="text-center">L</th>
                                        <th class="text-center">A</th>
                                        <th class="text-center">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($reportData as $row): ?>
                                        <tr>
                                            <td style="position: sticky; left: 0; background: var(--bg-card); z-index: 1;">
                                                <strong><?php echo sanitize($row['name']); ?></strong>
                                            </td>
                                            <td class="text-muted"><?php echo sanitize($row['student_id'] ?? '-'); ?></td>
                                            <?php foreach ($sessions as $sess):
                                                $status = $row['sessions'][$sess['id']] ?? 'absent';
                                                $icon = ['present' => 'check', 'late' => 'clock', 'absent' => 'times', 'excused' => 'info'][$status];
                                                $color = ['present' => 'success', 'late' => 'warning', 'absent' => 'danger', 'excused' => 'primary'][$status];
                                                ?>
                                                <td class="text-center">
                                                    <i class="fas fa-<?php echo $icon; ?> text-<?php echo $color; ?>"
                                                        title="<?php echo ucfirst($status); ?>"></i>
                                                </td>
                                            <?php endforeach; ?>
                                            <td class="text-center text-success"><?php echo $row['present']; ?></td>
                                            <td class="text-center text-warning"><?php echo $row['late']; ?></td>
                                            <td class="text-center text-danger"><?php echo $row['absent']; ?></td>
                                            <td class="text-center">
                                                <span
                                                    class="badge badge-<?php echo $row['rate'] >= 75 ? 'success' : ($row['rate'] >= 50 ? 'warning' : 'danger'); ?>">
                                                    <?php echo $row['rate']; ?>%
                                                </span>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                    <?php if (empty($reportData)): ?>
                                        <tr>
                                            <td colspan="<?php echo 5 + count($sessions); ?>" class="text-center text-muted">No
                                                students enrolled</td>
                                        </tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                <?php elseif (!$selectedCourse): ?>
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <h3>Select a Course</h3>
                        <p>Choose a course from the dropdown to view attendance reports</p>
                    </div>
                <?php endif; ?>
            </div>
        </main>
    </div>
    <script src="../assets/js/dashboard.js"></script>
    <style>
        .filter-form .filter-group {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .filter-form .form-input {
            width: auto;
            min-width: 280px;
        }
    </style>
</body>

</html>