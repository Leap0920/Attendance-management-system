<?php
/**
 * Student Attendance API - Core Feature
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('student');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../student/dashboard.php', 'error', 'Invalid request');
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = Session::getUserId();

try {
    switch ($action) {
        case 'submit':
            $sessionId = $_POST['session_id'] ?? 0;
            $code = strtoupper(trim($_POST['attendance_code'] ?? ''));

            if (empty($sessionId) || empty($code)) {
                redirect('../../student/dashboard.php', 'error', 'Please select a session and enter the code');
            }

            // Get session details
            $stmt = $db->prepare("SELECT ats.*, c.course_name 
                FROM attendance_sessions ats 
                JOIN courses c ON ats.course_id = c.id
                WHERE ats.id = ?");
            $stmt->execute([$sessionId]);
            $session = $stmt->fetch();

            if (!$session) {
                redirect('../../student/dashboard.php', 'error', 'Session not found');
            }

            // Verify student is enrolled
            $stmt = $db->prepare("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = 'active'");
            $stmt->execute([$userId, $session['course_id']]);
            if (!$stmt->fetch()) {
                redirect('../../student/dashboard.php', 'error', 'You are not enrolled in this course');
            }

            // Check if already submitted
            $stmt = $db->prepare("SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?");
            $stmt->execute([$sessionId, $userId]);
            if ($stmt->fetch()) {
                redirect('../../student/dashboard.php', 'error', 'You have already submitted attendance for this session');
            }

            // Verify code
            if ($session['attendance_code'] !== $code) {
                redirect('../../student/dashboard.php', 'error', 'Invalid attendance code');
            }

            // Check session status and time
            $now = time();
            $startTime = strtotime($session['start_time']);
            $endTime = strtotime($session['end_time']);
            $lateThreshold = $startTime + ($session['late_minutes'] * 60);

            if ($session['status'] !== 'active') {
                redirect('../../student/dashboard.php', 'error', 'This attendance session is no longer active');
            }

            if ($now > $endTime) {
                // Check if late submissions are allowed
                if (!$session['allow_late']) {
                    redirect('../../student/dashboard.php', 'error', 'Attendance window has closed');
                }
                $status = 'late';
            } elseif ($now > $lateThreshold) {
                $status = 'late';
            } else {
                $status = 'present';
            }

            // Record attendance
            $stmt = $db->prepare("INSERT INTO attendance_records 
                (session_id, student_id, course_id, status, ip_address, device_info)
                VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $sessionId,
                $userId,
                $session['course_id'],
                $status,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);

            logAudit($db, $userId, 'submit_attendance', 'attendance_record', $db->lastInsertId());

            $message = $status === 'present'
                ? 'Attendance recorded successfully! You are marked as Present.'
                : 'Attendance recorded as Late.';

            redirect('../../student/dashboard.php', 'success', $message);
            break;

        default:
            redirect('../../student/dashboard.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../student/dashboard.php', 'error', 'An error occurred: ' . $e->getMessage());
}
?>