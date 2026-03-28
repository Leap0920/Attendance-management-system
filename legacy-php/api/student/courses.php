<?php
/**
 * Student Courses API
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
        case 'join':
            $joinCode = strtoupper(trim($_POST['join_code'] ?? ''));

            if (empty($joinCode)) {
                redirect('../../student/dashboard.php', 'error', 'Please enter a join code');
            }

            // Find course
            $stmt = $db->prepare("SELECT c.*, u.first_name, u.last_name 
                FROM courses c 
                JOIN users u ON c.teacher_id = u.id
                WHERE c.join_code = ? AND c.status = 'active'");
            $stmt->execute([$joinCode]);
            $course = $stmt->fetch();

            if (!$course) {
                redirect('../../student/dashboard.php', 'error', 'Invalid join code. Please check and try again.');
            }

            // Check if already enrolled
            $stmt = $db->prepare("SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?");
            $stmt->execute([$userId, $course['id']]);
            $existing = $stmt->fetch();

            if ($existing) {
                if ($existing['status'] === 'active') {
                    redirect('../../student/dashboard.php', 'error', 'You are already enrolled in this course');
                }
                // Reactivate dropped enrollment
                $stmt = $db->prepare("UPDATE enrollments SET status = 'active', enrolled_at = NOW() WHERE id = ?");
                $stmt->execute([$existing['id']]);
            } else {
                // Create new enrollment
                $stmt = $db->prepare("INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'active')");
                $stmt->execute([$userId, $course['id']]);
            }

            logAudit($db, $userId, 'join_course', 'enrollment', $course['id']);

            redirect(
                '../../student/dashboard.php',
                'success',
                "Successfully joined {$course['course_name']} by {$course['first_name']} {$course['last_name']}!"
            );
            break;

        case 'leave':
            $courseId = $_POST['course_id'] ?? 0;

            $stmt = $db->prepare("UPDATE enrollments SET status = 'dropped' WHERE student_id = ? AND course_id = ?");
            $stmt->execute([$userId, $courseId]);

            logAudit($db, $userId, 'leave_course', 'enrollment', $courseId);
            redirect('../../student/dashboard.php', 'success', 'You have left the course');
            break;

        default:
            redirect('../../student/dashboard.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../student/dashboard.php', 'error', 'An error occurred');
}
?>