<?php
/**
 * Comments API - handles creating and fetching comments for materials
 */
require_once '../config/database.php';
require_once '../config/session.php';
require_once '../includes/functions.php';

$db = getDB();
require_once '../config/session.php';
// Use Session class for authentication
// Note: session is started by session.php
$userId = Session::getUserId();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // create comment
    if (!Session::isLoggedIn()) redirect('../index.php', 'error', 'Not authenticated');
    $materialId = intval($_POST['material_id'] ?? 0);
    $courseId = intval($_POST['course_id'] ?? 0);
    $content = trim($_POST['content'] ?? '');
    $parentId = intval($_POST['parent_id'] ?? 0) ?: null;

    if (empty($materialId) || empty($courseId) || empty($content)) {
        redirect('../student/materials.php', 'error', 'Invalid comment');
    }

    $stmt = $db->prepare("INSERT INTO comments (course_id, material_id, user_id, parent_id, content, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$courseId, $materialId, $userId, $parentId, $content]);
    $commentId = $db->lastInsertId();
    logAudit($db, $userId, 'create_comment', 'comment', $commentId);

    // If AJAX request, return JSON
    if (!empty($_POST['ajax'])) {
        $stmt = $db->prepare("SELECT c.*, u.first_name, u.last_name, u.role FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?");
        $stmt->execute([$commentId]);
        $new = $stmt->fetch();
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'comment' => $new]);
        exit;
    }

    // redirect back to material modal view
    redirect('../student/materials.php?course=' . $courseId, 'success', 'Comment posted');
}

// GET: return comments as JSON for AJAX
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $materialId = intval($_GET['material_id'] ?? 0);
    if (empty($materialId)) {
        header('Content-Type: application/json');
        echo json_encode([]); exit;
    }

    $stmt = $db->prepare("SELECT c.*, u.first_name, u.last_name, u.role FROM comments c JOIN users u ON c.user_id = u.id WHERE c.material_id = ? ORDER BY c.created_at ASC");
    $stmt->execute([$materialId]);
    $comments = $stmt->fetchAll();
    header('Content-Type: application/json');
    echo json_encode($comments);
    exit;
}

?>
