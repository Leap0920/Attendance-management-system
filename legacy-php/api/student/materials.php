<?php
/**
 * Student Materials API - handle assignment submissions
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('student');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../student/materials.php', 'error', 'Invalid request');
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = Session::getUserId();

try {
    switch ($action) {
        case 'submit_assignment':
            $materialId = intval($_POST['material_id'] ?? 0);
            if (empty($materialId)) redirect('../../student/materials.php', 'error', 'Invalid material');

            // verify material exists and is assignment
            $stmt = $db->prepare("SELECT m.*, c.id as course_id FROM course_materials m JOIN courses c ON m.course_id = c.id WHERE m.id = ?");
            $stmt->execute([$materialId]);
            $material = $stmt->fetch();
            if (!$material) redirect('../../student/materials.php', 'error', 'Material not found');
            if ($material['type'] !== 'assignment') redirect('../../student/materials.php', 'error', 'Not an assignment');
            // Consider assignment closed if teacher set is_closed OR due_date passed
            $now = time();
            $duePassed = !empty($material['due_date']) && strtotime($material['due_date']) < $now;
            if (!empty($material['is_closed']) || $duePassed) redirect('../../student/materials.php', 'error', 'Assignment is closed');

            // handle optional file upload and/or text content
            $filePath = null; $fileName = null; $fileSize = null; $content = trim($_POST['content'] ?? '');

            if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
                if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) redirect('../../student/materials.php', 'error', 'File upload error');
                $file = $_FILES['file'];
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $allowed = explode(',', getenv('ALLOWED_FILE_TYPES') ?: 'pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,png,mp4');
                if (!in_array($ext, $allowed)) redirect('../../student/materials.php', 'error', 'File type not allowed');
                $maxSize = intval(getSetting($db, 'max_file_size') ?? 10*1024*1024);
                if ($file['size'] > $maxSize) redirect('../../student/materials.php', 'error', 'File too large');

                $newName = time() . '_' . uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file['name']);
                $uploadDir = '../../uploads/materials/' . $material['course_id'] . '/submissions/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                $filePathRel = 'uploads/materials/' . $material['course_id'] . '/submissions/' . $newName;
                if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newName)) redirect('../../student/materials.php', 'error', 'Failed to upload file');
                $filePath = $filePathRel; $fileName = $file['name']; $fileSize = $file['size'];
            }

            // insert submission (allow resubmission if teacher reopens)
            $stmt = $db->prepare("INSERT INTO assignment_submissions (material_id, student_id, file_path, file_name, file_size, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'submitted', NOW())");
            $stmt->execute([$materialId, $userId, $filePath, $fileName, $fileSize, $content ?: null]);

            logAudit($db, $userId, 'submit_assignment', 'assignment_submission', $db->lastInsertId());
            redirect('../../student/materials.php?course=' . $material['course_id'], 'success', 'Assignment submitted');
            break;

        default:
            redirect('../../student/materials.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    error_log('Student Materials API: ' . $e->getMessage());
    redirect('../../student/materials.php', 'error', 'An error occurred');
}

?>
