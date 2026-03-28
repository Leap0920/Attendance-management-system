<?php
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('teacher');

header('Content-Type: application/json; charset=utf-8');

$materialId = intval($_GET['material_id'] ?? 0);
if (!$materialId) {
    echo json_encode(['success' => false, 'message' => 'Missing material_id']);
    exit;
}

$db = getDB();
$userId = Session::getUserId();

try {
    // Verify ownership: material belongs to a course owned by this teacher
    $stmt = $db->prepare("SELECT m.id FROM course_materials m JOIN courses c ON m.course_id = c.id WHERE m.id = ? AND c.teacher_id = ?");
    $stmt->execute([$materialId, $userId]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Material not found or access denied']);
        exit;
    }

    $stmt = $db->prepare("SELECT s.*, u.first_name, u.last_name FROM assignment_submissions s JOIN users u ON s.student_id = u.id WHERE s.material_id = ? ORDER BY s.submitted_at DESC");
    $stmt->execute([$materialId]);
    $rows = $stmt->fetchAll();

    $subs = [];
    foreach ($rows as $r) {
        $subs[] = [
            'id' => (int)$r['id'],
            'material_id' => (int)$r['material_id'],
            'student_id' => (int)$r['student_id'],
            'student_name' => trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? '')),
            'file_path' => $r['file_path'],
            'file_name' => $r['file_name'],
            'file_size' => $r['file_size'],
            'content' => $r['content'],
            'status' => $r['status'],
            'grade' => $r['grade'],
            'feedback' => $r['feedback'],
            'submitted_at' => $r['submitted_at']
        ];
    }

    echo json_encode(['success' => true, 'submissions' => $subs]);
} catch (Exception $e) {
    error_log('Submissions API error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Server error']);
}

?>
