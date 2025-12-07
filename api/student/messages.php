<?php
/**
 * Student Messages API
 * Handles Direct Messages and Course Group Chats for students
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('student');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../student/messages.php', 'error', 'Invalid request');
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = Session::getUserId();

try {
    switch ($action) {
        case 'send':
            // Direct Message
            $receiverId = $_POST['receiver_id'] ?? 0;
            $subject = trim($_POST['subject'] ?? '');
            $content = trim($_POST['content'] ?? '');

            if (empty($receiverId) || empty($content)) {
                redirect('../../student/messages.php', 'error', 'Recipient and message are required');
            }

            // Verify receiver exists
            $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$receiverId]);
            if (!$stmt->fetch()) {
                redirect('../../student/messages.php', 'error', 'Recipient not found');
            }

            // Insert message
            $stmt = $db->prepare("INSERT INTO messages (sender_id, receiver_id, subject, content)
                VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $receiverId, $subject ?: null, $content]);

            logAudit($db, $userId, 'send_dm', 'message', $db->lastInsertId());
            redirect('../../student/messages.php?mode=dm&user=' . $receiverId, 'success', 'Message sent');
            break;

        case 'send_group':
            // Group Message (Course Chat)
            $courseId = $_POST['course_id'] ?? 0;
            $content = trim($_POST['content'] ?? '');

            if (empty($courseId) || empty($content)) {
                redirect('../../student/messages.php', 'error', 'Course and message are required');
            }

            // Verify enrollment in course
            $stmt = $db->prepare("SELECT e.id FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                WHERE e.course_id = ? AND e.student_id = ? AND e.status = 'active'");
            $stmt->execute([$courseId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../student/messages.php?mode=group&course=' . $courseId, 'error', 'You are not enrolled in this course');
            }

            // Insert group message
            $stmt = $db->prepare("INSERT INTO course_messages (course_id, sender_id, content)
                VALUES (?, ?, ?)");
            $stmt->execute([$courseId, $userId, $content]);

            logAudit($db, $userId, 'send_group_message', 'course_message', $db->lastInsertId());
            redirect('../../student/messages.php?mode=group&course=' . $courseId);
            break;

        case 'mark_read':
            $senderId = $_POST['sender_id'] ?? 0;
            $stmt = $db->prepare("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
            $stmt->execute([$senderId, $userId]);
            echo json_encode(['success' => true]);
            break;

        default:
            redirect('../../student/messages.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../student/messages.php', 'error', 'An error occurred');
}
?>