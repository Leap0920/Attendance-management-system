<?php
/**
 * Teacher Attendance API - Core Feature
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('teacher');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../teacher/dashboard.php', 'error', 'Invalid request');
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = Session::getUserId();

try {
    switch ($action) {
        case 'create':
            $courseId = $_POST['course_id'] ?? 0;
            $sessionTitle = trim($_POST['session_title'] ?? '');
            $duration = intval($_POST['duration'] ?? 10);
            $allowLate = isset($_POST['allow_late']) ? 1 : 0;

            // Verify teacher owns this course
            $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$courseId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/dashboard.php', 'error', 'Course not found');
            }

            // Check for existing active session
            $stmt = $db->prepare("SELECT id FROM attendance_sessions WHERE course_id = ? AND status = 'active'");
            $stmt->execute([$courseId]);
            if ($stmt->fetch()) {
                redirect('../../teacher/dashboard.php', 'error', 'An active session already exists for this course');
            }

            // Generate unique code
            $code = generateAttendanceCode($db);

            // Create session using MySQL NOW() for consistent timing across teacher/student
            $stmt = $db->prepare("INSERT INTO attendance_sessions 
                (course_id, teacher_id, session_title, attendance_code, duration_minutes, start_time, end_time, status, allow_late)
                VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'active', ?)");
            $stmt->execute([$courseId, $userId, $sessionTitle ?: null, $code, $duration, $duration, $allowLate]);

            $sessionId = $db->lastInsertId();
            logAudit($db, $userId, 'create_attendance_session', 'attendance_session', $sessionId);

            redirect('../../teacher/dashboard.php', 'success', "Attendance session started! Code: $code");
            break;

        case 'close':
            $sessionId = $_POST['session_id'] ?? 0;

            // Verify ownership
            $stmt = $db->prepare("SELECT ats.*, c.course_name FROM attendance_sessions ats 
                JOIN courses c ON ats.course_id = c.id 
                WHERE ats.id = ? AND ats.teacher_id = ?");
            $stmt->execute([$sessionId, $userId]);
            $session = $stmt->fetch();

            if (!$session) {
                redirect('../../teacher/dashboard.php', 'error', 'Session not found');
            }

            // Close session
            $stmt = $db->prepare("UPDATE attendance_sessions SET status = 'closed' WHERE id = ?");
            $stmt->execute([$sessionId]);

            // Mark absent students who didn't submit
            $stmt = $db->prepare("INSERT INTO attendance_records (session_id, student_id, course_id, status)
                SELECT ?, e.student_id, e.course_id, 'absent'
                FROM enrollments e
                WHERE e.course_id = ? AND e.status = 'active'
                AND e.student_id NOT IN (SELECT student_id FROM attendance_records WHERE session_id = ?)");
            $stmt->execute([$sessionId, $session['course_id'], $sessionId]);

            logAudit($db, $userId, 'close_attendance_session', 'attendance_session', $sessionId);

            redirect('../../teacher/dashboard.php', 'success', 'Attendance session closed');
            break;

        case 'extend':
            $sessionId = $_POST['session_id'] ?? 0;
            $extraMinutes = intval($_POST['extra_minutes'] ?? 5);

            $stmt = $db->prepare("UPDATE attendance_sessions 
                SET end_time = DATE_ADD(end_time, INTERVAL ? MINUTE),
                    duration_minutes = duration_minutes + ?
                WHERE id = ? AND teacher_id = ? AND status = 'active'");
            $stmt->execute([$extraMinutes, $extraMinutes, $sessionId, $userId]);

            redirect('../../teacher/dashboard.php', 'success', "Session extended by $extraMinutes minutes");
            break;

        case 'update_record':
            $recordId = $_POST['record_id'] ?? 0;
            $status = $_POST['status'] ?? 'present';
            $notes = trim($_POST['notes'] ?? '');

            // Verify ownership through joins
            $stmt = $db->prepare("SELECT ar.id FROM attendance_records ar
                JOIN attendance_sessions ats ON ar.session_id = ats.id
                WHERE ar.id = ? AND ats.teacher_id = ?");
            $stmt->execute([$recordId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/attendance.php', 'error', 'Record not found');
            }

            $stmt = $db->prepare("UPDATE attendance_records SET status = ?, notes = ? WHERE id = ?");
            $stmt->execute([$status, $notes ?: null, $recordId]);

            redirect($_SERVER['HTTP_REFERER'] ?? '../../teacher/attendance.php', 'success', 'Record updated');
            break;

        default:
            redirect('../../teacher/dashboard.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../teacher/dashboard.php', 'error', 'An error occurred: ' . $e->getMessage());
}
?>