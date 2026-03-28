<?php
/**
 * Teacher Messages API
 * Handles both Direct Messages and Course Group Chats
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('teacher');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../teacher/messages.php', 'error', 'Invalid request');
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
                redirect('../../teacher/messages.php', 'error', 'Recipient and message are required');
            }

            // Verify receiver exists
            $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$receiverId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/messages.php', 'error', 'Recipient not found');
            }

            // Insert message
            $stmt = $db->prepare("INSERT INTO messages (sender_id, receiver_id, subject, content)
                VALUES (?, ?, ?, ?)");
            $stmt->execute([$userId, $receiverId, $subject ?: null, $content]);

            logAudit($db, $userId, 'send_dm', 'message', $db->lastInsertId());
            redirect('../../teacher/messages.php?mode=dm&user=' . $receiverId, 'success', 'Message sent');
            break;

        case 'send_group':
            // Group Message (Course Chat)
            $courseId = $_POST['course_id'] ?? 0;
            $content = trim($_POST['content'] ?? '');

            if (empty($courseId) || empty($content)) {
                redirect('../../teacher/messages.php', 'error', 'Course and message are required');
            }

            // Verify course ownership
            $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$courseId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/messages.php?mode=group&course=' . $courseId, 'error', 'Course not found');
            }

            // Insert group message
            $stmt = $db->prepare("INSERT INTO course_messages (course_id, sender_id, content)
                VALUES (?, ?, ?)");
            $stmt->execute([$courseId, $userId, $content]);

            logAudit($db, $userId, 'send_group_message', 'course_message', $db->lastInsertId());
            redirect('../../teacher/messages.php?mode=group&course=' . $courseId);
            break;

        case 'pin_message':
            // Pin/unpin a group message
            $messageId = $_POST['message_id'] ?? 0;
            $courseId = $_POST['course_id'] ?? 0;

            // Verify ownership
            $stmt = $db->prepare("SELECT cm.id FROM course_messages cm
                JOIN courses c ON cm.course_id = c.id
                WHERE cm.id = ? AND c.teacher_id = ?");
            $stmt->execute([$messageId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/messages.php', 'error', 'Message not found');
            }

            $stmt = $db->prepare("UPDATE course_messages SET is_pinned = NOT is_pinned WHERE id = ?");
            $stmt->execute([$messageId]);

            redirect('../../teacher/messages.php?mode=group&course=' . $courseId);
            break;

        case 'delete_group_message':
            // Delete a group message
            $messageId = $_POST['message_id'] ?? 0;
            $courseId = $_POST['course_id'] ?? 0;

            // Verify ownership (teacher can delete any message in their course)
            $stmt = $db->prepare("SELECT cm.id FROM course_messages cm
                JOIN courses c ON cm.course_id = c.id
                WHERE cm.id = ? AND c.teacher_id = ?");
            $stmt->execute([$messageId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/messages.php', 'error', 'Message not found');
            }

            $stmt = $db->prepare("DELETE FROM course_messages WHERE id = ?");
            $stmt->execute([$messageId]);

            logAudit($db, $userId, 'delete_group_message', 'course_message', $messageId);
            redirect('../../teacher/messages.php?mode=group&course=' . $courseId, 'success', 'Message deleted');
            break;

        case 'broadcast':
            // Send individual DM to all students in a course
            $courseId = $_POST['course_id'] ?? 0;
            $subject = trim($_POST['subject'] ?? '');
            $content = trim($_POST['content'] ?? '');

            if (empty($courseId) || empty($content)) {
                redirect('../../teacher/messages.php', 'error', 'Course and message are required');
            }

            // Verify course ownership
            $stmt = $db->prepare("SELECT id, course_name FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$courseId, $userId]);
            $course = $stmt->fetch();
            if (!$course) {
                redirect('../../teacher/messages.php', 'error', 'Course not found');
            }

            // Get all enrolled students
            $stmt = $db->prepare("SELECT student_id FROM enrollments WHERE course_id = ? AND status = 'active'");
            $stmt->execute([$courseId]);
            $students = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Send DM to each student
            $messageSubject = $subject ?: '[' . $course['course_name'] . '] Announcement';
            foreach ($students as $studentId) {
                $stmt = $db->prepare("INSERT INTO messages (sender_id, receiver_id, subject, content, course_id)
                    VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$userId, $studentId, $messageSubject, $content, $courseId]);
            }

            logAudit($db, $userId, 'broadcast_message', 'course', $courseId, null, ['count' => count($students)]);
            redirect('../../teacher/messages.php', 'success', 'Message sent to ' . count($students) . ' students');
            break;

        case 'mark_read':
            $senderId = $_POST['sender_id'] ?? 0;
            $stmt = $db->prepare("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
            $stmt->execute([$senderId, $userId]);
            echo json_encode(['success' => true]);
            break;

        default:
            redirect('../../teacher/messages.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../teacher/messages.php', 'error', 'An error occurred: ' . $e->getMessage());
}
?>