<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Get conversations (grouped by last message with each user)
$stmt = $db->prepare("
    SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.role,
        u.avatar,
        m.content as last_message,
        m.created_at as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
    FROM users u
    INNER JOIN (
        SELECT 
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
            MAX(id) as max_id
        FROM messages 
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY other_user_id
    ) latest ON u.id = latest.other_user_id
    INNER JOIN messages m ON m.id = latest.max_id
    ORDER BY m.created_at DESC
");
$stmt->execute([$user['id'], $user['id'], $user['id'], $user['id']]);
$conversations = $stmt->fetchAll();

// Get specific conversation if user selected
$selectedUserId = $_GET['user'] ?? null;
$selectedUser = null;
$messages = [];

if ($selectedUserId) {
    // Get user info
    $stmt = $db->prepare("SELECT id, first_name, last_name, email, role, avatar FROM users WHERE id = ?");
    $stmt->execute([$selectedUserId]);
    $selectedUser = $stmt->fetch();

    if ($selectedUser) {
        // Get messages
        $stmt = $db->prepare("
            SELECT m.*, 
                   CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END as is_mine
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = ?) 
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
        ");
        $stmt->execute([$user['id'], $user['id'], $selectedUserId, $selectedUserId, $user['id']]);
        $messages = $stmt->fetchAll();

        // Mark as read
        $stmt = $db->prepare("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
        $stmt->execute([$selectedUserId, $user['id']]);
    }
}

// Get students from teacher's courses for new message
$stmt = $db->prepare("
    SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, c.course_name
    FROM users u
    JOIN enrollments e ON u.id = e.student_id
    JOIN courses c ON e.course_id = c.id
    WHERE c.teacher_id = ? AND e.status = 'active'
    ORDER BY u.last_name, u.first_name
");
$stmt->execute([$user['id']]);
$students = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Messages - AttendEase</title>
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
                        <h1>Messages</h1>
                        <p class="text-muted">Communicate with your students</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openModal('newMessageModal')">
                            <i class="fas fa-plus"></i> New Message
                        </button>
                    </div>
                </div>

                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <i
                            class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <div class="messages-container">
                    <!-- Conversations List -->
                    <div class="conversations-list">
                        <div class="conversations-header">
                            <h3>Conversations</h3>
                        </div>
                        <div class="conversations-items">
                            <?php foreach ($conversations as $conv): ?>
                                <a href="?user=<?php echo $conv['user_id']; ?>"
                                    class="conversation-item <?php echo $selectedUserId == $conv['user_id'] ? 'active' : ''; ?> <?php echo $conv['unread_count'] > 0 ? 'unread' : ''; ?>">
                                    <div class="avatar-initials" style="background: var(--primary);">
                                        <?php echo getInitials($conv['first_name'], $conv['last_name']); ?>
                                    </div>
                                    <div class="conversation-info">
                                        <div class="conversation-name">
                                            <?php echo sanitize($conv['first_name'] . ' ' . $conv['last_name']); ?>
                                            <?php if ($conv['unread_count'] > 0): ?>
                                                <span class="unread-badge"><?php echo $conv['unread_count']; ?></span>
                                            <?php endif; ?>
                                        </div>
                                        <div class="conversation-preview">
                                            <?php echo sanitize(substr($conv['last_message'], 0, 40)) . (strlen($conv['last_message']) > 40 ? '...' : ''); ?>
                                        </div>
                                    </div>
                                    <div class="conversation-time"><?php echo timeAgo($conv['last_message_time']); ?></div>
                                </a>
                            <?php endforeach; ?>

                            <?php if (empty($conversations)): ?>
                                <div class="empty-conversations">
                                    <i class="fas fa-comments"></i>
                                    <p>No conversations yet</p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Message Thread -->
                    <div class="message-thread">
                        <?php if ($selectedUser): ?>
                            <div class="thread-header">
                                <div class="thread-user">
                                    <div class="avatar-initials" style="background: var(--primary);">
                                        <?php echo getInitials($selectedUser['first_name'], $selectedUser['last_name']); ?>
                                    </div>
                                    <div>
                                        <h4><?php echo sanitize($selectedUser['first_name'] . ' ' . $selectedUser['last_name']); ?>
                                        </h4>
                                        <span class="text-muted"><?php echo ucfirst($selectedUser['role']); ?></span>
                                    </div>
                                </div>
                            </div>

                            <div class="thread-messages" id="messageThread">
                                <?php foreach ($messages as $m): ?>
                                    <div class="message <?php echo $m['is_mine'] ? 'mine' : 'theirs'; ?>">
                                        <div class="message-bubble">
                                            <?php if ($m['subject']): ?>
                                                <div class="message-subject"><?php echo sanitize($m['subject']); ?></div>
                                            <?php endif; ?>
                                            <div class="message-content"><?php echo nl2br(sanitize($m['content'])); ?></div>
                                            <div class="message-time"><?php echo formatDateTime($m['created_at']); ?></div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>

                            <div class="thread-input">
                                <form action="../api/teacher/messages.php" method="POST" class="reply-form">
                                    <input type="hidden" name="action" value="send">
                                    <input type="hidden" name="receiver_id" value="<?php echo $selectedUser['id']; ?>">
                                    <textarea name="content" class="form-input" placeholder="Type your message..." rows="2"
                                        required></textarea>
                                    <button type="submit" class="btn btn-primary"><i
                                            class="fas fa-paper-plane"></i></button>
                                </form>
                            </div>
                        <?php else: ?>
                            <div class="thread-empty">
                                <i class="fas fa-comments"></i>
                                <h3>Select a Conversation</h3>
                                <p>Choose a conversation from the list or start a new one</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- New Message Modal -->
    <div class="modal-overlay" id="newMessageModal">
        <div class="modal">
            <div class="modal-header">
                <h3>New Message</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('newMessageModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/messages.php" method="POST">
                <input type="hidden" name="action" value="send">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">To *</label>
                        <select name="receiver_id" class="form-input" required>
                            <option value="">Select recipient...</option>
                            <?php foreach ($students as $s): ?>
                                <option value="<?php echo $s['id']; ?>">
                                    <?php echo sanitize($s['first_name'] . ' ' . $s['last_name'] . ' (' . $s['course_name'] . ')'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subject</label>
                        <input type="text" name="subject" class="form-input" placeholder="Message subject (optional)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Message *</label>
                        <textarea name="content" class="form-input" rows="5" placeholder="Type your message..."
                            required></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('newMessageModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Send</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        // Scroll to bottom of messages
        const thread = document.getElementById('messageThread');
        if (thread) thread.scrollTop = thread.scrollHeight;
    </script>
    <style>
        .messages-container {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 24px;
            height: calc(100vh - 220px);
            min-height: 500px;
        }

        .conversations-list {
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .conversations-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
        }

        .conversations-header h3 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }

        .conversations-items {
            flex: 1;
            overflow-y: auto;
        }

        .conversation-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            text-decoration: none;
            color: inherit;
            transition: var(--transition);
        }

        .conversation-item:hover {
            background: var(--bg-card);
        }

        .conversation-item.active {
            background: rgba(66, 133, 244, 0.1);
            border-left: 3px solid var(--primary);
        }

        .conversation-item.unread {
            background: rgba(66, 133, 244, 0.05);
        }

        .conversation-item .avatar-initials {
            width: 40px;
            height: 40px;
            font-size: 14px;
            flex-shrink: 0;
        }

        .conversation-info {
            flex: 1;
            min-width: 0;
        }

        .conversation-name {
            font-weight: 600;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .conversation-preview {
            font-size: 13px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .conversation-time {
            font-size: 11px;
            color: var(--text-muted);
            white-space: nowrap;
        }

        .unread-badge {
            background: var(--primary);
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 600;
        }

        .empty-conversations {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
        }

        .empty-conversations i {
            font-size: 32px;
            margin-bottom: 12px;
        }

        .message-thread {
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .thread-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-card);
        }

        .thread-user {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .thread-user h4 {
            margin: 0;
            font-size: 16px;
        }

        .thread-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            max-width: 70%;
        }

        .message.mine {
            align-self: flex-end;
        }

        .message.theirs {
            align-self: flex-start;
        }

        .message-bubble {
            padding: 12px 16px;
            border-radius: 16px;
        }

        .message.mine .message-bubble {
            background: var(--primary);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .message.theirs .message-bubble {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-bottom-left-radius: 4px;
        }

        .message-subject {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 13px;
        }

        .message-content {
            font-size: 14px;
            line-height: 1.5;
        }

        .message-time {
            font-size: 11px;
            margin-top: 6px;
            opacity: 0.7;
        }

        .thread-input {
            padding: 16px 20px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-card);
        }

        .reply-form {
            display: flex;
            gap: 12px;
            align-items: flex-end;
        }

        .reply-form textarea {
            flex: 1;
            resize: none;
        }

        .thread-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-muted);
        }

        .thread-empty i {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .thread-empty h3 {
            margin-bottom: 8px;
        }

        @media (max-width: 768px) {
            .messages-container {
                grid-template-columns: 1fr;
            }

            .conversations-list {
                max-height: 300px;
            }
        }
    </style>
</body>

</html>