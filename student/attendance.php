<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

// Get ACTIVE attendance sessions for enrolled courses
$stmt = $db->prepare("SELECT ats.*, c.course_name, c.course_code, c.cover_color
    FROM attendance_sessions ats
    JOIN courses c ON ats.course_id = c.id
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.student_id = ? AND e.status = 'active' AND ats.status = 'active'
    AND ats.end_time > NOW()
    AND ats.id NOT IN (SELECT session_id FROM attendance_records WHERE student_id = ?)
    ORDER BY ats.end_time ASC");
$stmt->execute([$user['id'], $user['id']]);
$activeSessions = $stmt->fetchAll();

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

$flash = Session::getFlash();
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
                        <p class="text-muted">Submit attendance and view your records</p>
                    </div>
                </div>

                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <i
                            class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <!-- ACTIVE SESSIONS - Submit Attendance -->
                <?php if (!empty($activeSessions)): ?>
                    <div class="active-sessions-section animate-fade-in">
                        <div class="section-header-alert">
                            <i class="fas fa-bell"></i>
                            <span>Active Attendance Sessions (<?php echo count($activeSessions); ?>)</span>
                        </div>

                        <div class="active-sessions-grid">
                            <?php foreach ($activeSessions as $session): ?>
                                <div class="active-session-card"
                                    style="border-left: 4px solid <?php echo $session['cover_color']; ?>;">
                                    <div class="session-info">
                                        <div class="session-course">
                                            <strong><?php echo sanitize($session['course_code']); ?></strong>
                                            <span><?php echo sanitize($session['course_name']); ?></span>
                                        </div>
                                        <div class="session-title">
                                            <?php echo sanitize($session['session_title'] ?? 'Attendance Session'); ?></div>
                                        <div class="session-timer" data-end="<?php echo $session['end_time']; ?>">
                                            <i class="fas fa-clock"></i>
                                            <span class="timer-display">--:--</span> remaining
                                        </div>
                                    </div>
                                    <form action="../api/student/attendance.php" method="POST" class="session-form">
                                        <input type="hidden" name="action" value="submit">
                                        <input type="hidden" name="session_id" value="<?php echo $session['id']; ?>">
                                        <div class="code-input-group">
                                            <input type="text" name="attendance_code" class="form-input code-input"
                                                placeholder="CODE" maxlength="10" required
                                                style="text-transform: uppercase; letter-spacing: 3px; font-size: 18px; text-align: center; width: 150px;">
                                            <button type="submit" class="btn btn-success">
                                                <i class="fas fa-check"></i> Submit
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="no-active-sessions animate-fade-in">
                        <i class="fas fa-calendar-check"></i>
                        <p>No active attendance sessions right now</p>
                        <small class="text-muted">Check back when your teacher starts a session</small>
                    </div>
                <?php endif; ?>

                <!-- Summary Stats -->
                <div class="stats-grid" style="margin-top: 24px;">
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
    <script>
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
    <style>
        .active-sessions-section {
            margin-bottom: 24px;
        }

        .section-header-alert {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(52, 168, 83, 0.05));
            border: 1px solid rgba(52, 168, 83, 0.3);
            border-radius: var(--radius) var(--radius) 0 0;
            font-weight: 600;
            color: var(--success);
        }

        .section-header-alert i {
            font-size: 18px;
        }

        .active-sessions-grid {
            display: grid;
            gap: 16px;
            padding: 20px;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-top: none;
            border-radius: 0 0 var(--radius) var(--radius);
        }

        .active-session-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 24px;
            padding: 20px 24px;
            background: var(--bg-card);
            border-radius: var(--radius);
            flex-wrap: wrap;
        }

        .session-info {
            flex: 1;
            min-width: 200px;
        }

        .session-course strong {
            font-size: 16px;
            margin-right: 8px;
        }

        .session-course span {
            color: var(--text-secondary);
            font-size: 14px;
        }

        .session-title {
            margin: 8px 0;
            font-size: 14px;
            color: var(--text-muted);
        }

        .session-timer {
            font-size: 13px;
            color: var(--warning);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .timer-display {
            font-weight: 600;
            font-size: 16px;
        }

        .session-form {
            display: flex;
            align-items: center;
        }

        .code-input-group {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .no-active-sessions {
            text-align: center;
            padding: 40px;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
        }

        .no-active-sessions i {
            font-size: 48px;
            color: var(--text-muted);
            margin-bottom: 16px;
        }

        .no-active-sessions p {
            font-size: 16px;
            margin: 0;
        }

        @media (max-width: 768px) {
            .active-session-card {
                flex-direction: column;
                align-items: flex-start;
            }

            .session-form {
                width: 100%;
            }

            .code-input-group {
                flex: 1;
                width: 100%;
            }

            .code-input-group input {
                flex: 1;
            }
        }
    </style>
</body>

</html>