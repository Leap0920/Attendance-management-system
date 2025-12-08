<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

// Get enrolled courses for group chats
$stmt = $db->prepare("SELECT c.*, 
    (SELECT COUNT(*) FROM course_messages WHERE course_id = c.id) as message_count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.student_id = ? AND e.status = 'active' AND c.status = 'active'
    ORDER BY c.course_name");
$stmt->execute([$user['id']]);
$courses = $stmt->fetchAll();

// Get DM conversations
$stmt = $db->prepare("
    SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.role,
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

// Handle view mode
$viewMode = $_GET['mode'] ?? 'group';
$selectedCourse = $_GET['course'] ?? null;
$selectedUser = $_GET['user'] ?? null;

$messages = [];
$chatTitle = '';
$chatSubtitle = '';

if ($viewMode === 'group' && $selectedCourse) {
    // Verify enrollment
    $stmt = $db->prepare("SELECT c.* FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        WHERE c.id = ? AND e.student_id = ? AND e.status = 'active'");
    $stmt->execute([$selectedCourse, $user['id']]);
    $course = $stmt->fetch();

    if ($course) {
        $chatTitle = $course['course_code'] . ' - ' . $course['course_name'];
        $chatSubtitle = $course['section'] ?? 'Course Chat';

        // Get teacher info
        $stmt = $db->prepare("SELECT first_name, last_name FROM users WHERE id = ?");
        $stmt->execute([$course['teacher_id']]);
        $teacher = $stmt->fetch();

        // Get group messages
        $stmt = $db->prepare("SELECT cm.*, u.first_name, u.last_name, u.role,
            CASE WHEN cm.sender_id = ? THEN 1 ELSE 0 END as is_mine
            FROM course_messages cm
            JOIN users u ON cm.sender_id = u.id
            WHERE cm.course_id = ?
            ORDER BY cm.created_at ASC");
        $stmt->execute([$user['id'], $selectedCourse]);
        $messages = $stmt->fetchAll();

        // Get member count
        $stmt = $db->prepare("SELECT COUNT(*) FROM enrollments WHERE course_id = ? AND status = 'active'");
        $stmt->execute([$selectedCourse]);
        $memberCount = $stmt->fetchColumn() + 1; // +1 for teacher
    }
} elseif ($viewMode === 'dm' && $selectedUser) {
    $stmt = $db->prepare("SELECT id, first_name, last_name, email, role FROM users WHERE id = ?");
    $stmt->execute([$selectedUser]);
    $selectedUserData = $stmt->fetch();

    if ($selectedUserData) {
        $chatTitle = $selectedUserData['first_name'] . ' ' . $selectedUserData['last_name'];
        $chatSubtitle = ucfirst($selectedUserData['role']);

        $stmt = $db->prepare("SELECT m.*, 
            CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END as is_mine
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC");
        $stmt->execute([$user['id'], $user['id'], $selectedUser, $selectedUser, $user['id']]);
        $messages = $stmt->fetchAll();

        // Mark as read
        $stmt = $db->prepare("UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?");
        $stmt->execute([$selectedUser, $user['id']]);
    }
}

// Get teachers from enrolled courses for new DM
$stmt = $db->prepare("SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
    FROM users u
    JOIN courses c ON u.id = c.teacher_id
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.student_id = ? AND e.status = 'active'
    ORDER BY u.last_name, u.first_name");
$stmt->execute([$user['id']]);
$teachers = $stmt->fetchAll();

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
                        <p class="text-muted">Course chats and direct messages</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-ghost" onclick="openModal('newDMModal')">
                            <i class="fas fa-user"></i> Message Teacher
                        </button>
                    </div>
                </div>

                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <div class="messages-container">
                    <!-- Sidebar -->
                    <div class="conversations-list">
                        <div class="conversations-section">
                            <div class="section-title"><i class="fas fa-users"></i> Course Groups</div>
                            <?php foreach ($courses as $c): ?>
                                <a href="?mode=group&course=<?php echo $c['id']; ?>"
                                    class="conversation-item <?php echo ($viewMode === 'group' && $selectedCourse == $c['id']) ? 'active' : ''; ?>">
                                    <div class="avatar-initials" style="background: <?php echo $c['cover_color']; ?>;">
                                        <i class="fas fa-hashtag" style="font-size: 14px;"></i>
                                    </div>
                                    <div class="conversation-info">
                                        <div class="conversation-name"><?php echo sanitize($c['course_code']); ?></div>
                                        <div class="conversation-preview"><?php echo sanitize($c['course_name']); ?></div>
                                    </div>
                                    <?php if ($c['message_count'] > 0): ?>
                                        <span class="message-count"><?php echo $c['message_count']; ?></span>
                                    <?php endif; ?>
                                </a>
                            <?php endforeach; ?>
                        </div>

                        <div class="conversations-section">
                            <div class="section-title"><i class="fas fa-envelope"></i> Direct Messages</div>
                            <?php foreach ($conversations as $conv): ?>
                                <a href="?mode=dm&user=<?php echo $conv['user_id']; ?>"
                                    class="conversation-item <?php echo ($viewMode === 'dm' && $selectedUser == $conv['user_id']) ? 'active' : ''; ?>">
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
                                        <div class="conversation-preview"><?php echo ucfirst($conv['role']); ?></div>
                                    </div>
                                    <div class="conversation-time"><?php echo timeAgo($conv['last_message_time']); ?></div>
                                </a>
                            <?php endforeach; ?>
                            <?php if (empty($conversations)): ?>
                                <div class="empty-conversations small">
                                    <p>No DMs yet</p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Message Thread -->
                    <div class="message-thread">
                        <?php if ($chatTitle): ?>
                            <div class="thread-header">
                                <div class="thread-user">
                                    <?php if ($viewMode === 'group'): ?>
                                        <div class="avatar-initials"
                                            style="background: <?php echo $course['cover_color'] ?? 'var(--primary)'; ?>;">
                                            <i class="fas fa-hashtag"></i>
                                        </div>
                                    <?php else: ?>
                                        <div class="avatar-initials" style="background: var(--primary);">
                                            <?php echo getInitials($selectedUserData['first_name'] ?? '', $selectedUserData['last_name'] ?? ''); ?>
                                        </div>
                                    <?php endif; ?>
                                    <div>
                                        <h4><?php echo sanitize($chatTitle); ?></h4>
                                        <span class="text-muted"><?php echo sanitize($chatSubtitle); ?></span>
                                        <?php if ($viewMode === 'group' && isset($memberCount)): ?>
                                            <span class="text-muted"> • <?php echo $memberCount; ?> members</span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>

                            <div class="thread-messages" id="messageThread">
                                <?php if ($viewMode === 'group' && empty($messages)): ?>
                                    <div class="welcome-message">
                                        <i class="fas fa-comments"></i>
                                        <h4>Welcome to <?php echo sanitize($course['course_code']); ?>!</h4>
                                        <p>This is the course group chat. Say hello to your classmates!</p>
                                    </div>
                                <?php endif; ?>

                                <?php foreach ($messages as $m): ?>
                                    <div class="message <?php echo $m['is_mine'] ? 'mine' : 'theirs'; ?>">
                                        <?php if (!$m['is_mine'] && $viewMode === 'group'): ?>
                                            <div class="message-sender">
                                                <span
                                                    class="sender-name"><?php echo sanitize($m['first_name'] . ' ' . $m['last_name']); ?></span>
                                                <span
                                                    class="sender-role badge badge-<?php echo $m['role'] === 'teacher' ? 'primary' : 'secondary'; ?>"><?php echo ucfirst($m['role']); ?></span>
                                            </div>
                                        <?php endif; ?>
                                        <div class="message-bubble">
                                            <?php if (isset($m['subject']) && $m['subject']): ?>
                                                <div class="message-subject"><?php echo sanitize($m['subject']); ?></div>
                                            <?php endif; ?>
                                            <div class="message-content"><?php echo nl2br(sanitize($m['content'])); ?></div>
                                            <div class="message-time"><?php echo formatDateTime($m['created_at']); ?></div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>

                            <div class="thread-input">
                                <form action="../api/student/messages.php" method="POST" class="reply-form">
                                    <input type="hidden" name="action"
                                        value="<?php echo $viewMode === 'group' ? 'send_group' : 'send'; ?>">
                                    <?php if ($viewMode === 'group'): ?>
                                        <input type="hidden" name="course_id" value="<?php echo $selectedCourse; ?>">
                                    <?php else: ?>
                                        <input type="hidden" name="receiver_id" value="<?php echo $selectedUser; ?>">
                                    <?php endif; ?>
                                    <textarea name="content" class="form-input"
                                        placeholder="<?php echo $viewMode === 'group' ? 'Say something...' : 'Type a message...'; ?>"
                                        rows="2" required></textarea>
                                    <button type="submit" class="btn btn-primary"><i
                                            class="fas fa-paper-plane"></i></button>
                                </form>
                            </div>
                        <?php else: ?>
                            <div class="thread-empty">
                                <i class="fas fa-comments"></i>
                                <h3>Select a Chat</h3>
                                <p>Choose a course group or direct message</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- New DM Modal -->
    <div class="modal-overlay" id="newDMModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Message Teacher</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('newDMModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/student/messages.php" method="POST">
                <input type="hidden" name="action" value="send">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">To</label>
                        <select name="receiver_id" class="form-input" required>
                            <option value="">Select teacher...</option>
                            <?php foreach ($teachers as $t): ?>
                                <option value="<?php echo $t['id']; ?>">
                                    <?php echo sanitize($t['first_name'] . ' ' . $t['last_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subject</label>
                        <input type="text" name="subject" class="form-input" placeholder="Message subject (optional)">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Message</label>
                        <textarea name="content" class="form-input" rows="4" placeholder="Type your message..."
                            required></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('newDMModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Send</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        const thread = document.getElementById('messageThread');
        if (thread) thread.scrollTop = thread.scrollHeight;
    </script>
    <style>
        .messages-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 24px;
            /* Use auto height to avoid forcing viewport height which can cause horizontal issues on mobile */
            height: auto;
            min-height: 500px;
        }

        .conversations-list {
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            overflow-y: auto;
        }

        .conversations-section {
            padding: 8px 0;
        }

        .conversations-section+.conversations-section {
            border-top: 1px solid var(--border-color);
        }

        .section-title {
            padding: 12px 16px 8px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .conversation-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            text-decoration: none;
            color: inherit;
            transition: var(--transition);
            cursor: pointer;
        }

        .conversation-item:hover {
            background: var(--bg-card);
        }

        .conversation-item.active {
            background: rgba(66, 133, 244, 0.15);
            border-left: 3px solid var(--primary);
        }

        .conversation-item .avatar-initials {
            width: 36px;
            height: 36px;
            font-size: 12px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            color: white;
            font-weight: 600;
        }

        .conversation-info {
            flex: 1;
            min-width: 0;
        }

        .conversation-name {
            font-weight: 600;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .conversation-preview {
            font-size: 12px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .conversation-time {
            font-size: 10px;
            color: var(--text-muted);
        }

        .message-count {
            background: var(--bg-card);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
        }

        .unread-badge {
            background: var(--primary);
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 600;
            margin-left: 4px;
        }

        .empty-conversations {
            text-align: center;
            padding: 20px;
            color: var(--text-muted);
            font-size: 13px;
        }

        .empty-conversations.small {
            padding: 12px;
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
            font-size: 15px;
        }

        .thread-user .avatar-initials {
            width: 40px;
            height: 40px;
        }

        .thread-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .welcome-message {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
        }

        .welcome-message i {
            font-size: 48px;
            margin-bottom: 16px;
            color: var(--primary);
            opacity: 0.5;
        }

        .welcome-message h4 {
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .message {
            max-width: 75%;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .message.mine {
            align-self: flex-end;
        }

        .message.theirs {
            align-self: flex-start;
        }

        .message-sender {
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sender-name {
            font-size: 12px;
            font-weight: 600;
        }

        .sender-role {
            font-size: 10px;
            padding: 1px 6px;
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
            font-size: 10px;
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

        @media (max-width: 768px) {
            .messages-container {
                grid-template-columns: 1fr;
            }

            .conversations-list {
                max-height: 250px;
                overflow-y: auto;
            }

            /* Allow the message thread to size naturally and scroll vertically */
            .message-thread {
                max-height: calc(100vh - 260px);
                overflow-y: auto;
            }

            /* Ensure messages can use full width on mobile */
            .message {
                max-width: 100%;
            }
        }
    </style>
</body>

</html>