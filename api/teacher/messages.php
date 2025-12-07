<?php
/**
 * Teacher Messages API
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
            $receiverId = $_POST['receiver_id'] ?? 0;
            $subject = trim($_POST['subject'] ?? '');
            $content = trim($_POST['content'] ?? '');
            $courseId = $_POST['course_id'] ?? null;

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
            $stmt = $db->prepare("INSERT INTO messages (sender_id, receiver_id, subject, content, course_id)
                VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $userId,
                $receiverId,
                $subject ?: null,
                $content,
                $courseId ?: null
            ]);

            logAudit($db, $userId, 'send_message', 'message', $db->lastInsertId());
            redirect('../../teacher/messages.php?user=' . $receiverId, 'success', 'Message sent');
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
    redirect('../../teacher/messages.php', 'error', 'An error occurred');
}
?>