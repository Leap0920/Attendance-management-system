<?php
/**
 * Teacher Materials API
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('teacher');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../teacher/materials.php', 'error', 'Invalid request');
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = Session::getUserId();

// Allowed file types and max size
$allowedTypes = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'mp4', 'zip'];
$maxSize = 10 * 1024 * 1024; // 10MB

try {
    switch ($action) {
        case 'create':
            $courseId = $_POST['course_id'] ?? 0;
            $type = $_POST['type'] ?? 'file';
            $title = trim($_POST['title'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $externalLink = trim($_POST['external_link'] ?? '');
            $dueDate = $_POST['due_date'] ?? null;
            $isPinned = isset($_POST['is_pinned']) ? 1 : 0;

            if (empty($courseId) || empty($title)) {
                redirect('../../teacher/materials.php', 'error', 'Course and title are required');
            }

            // Verify course ownership
            $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$courseId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/materials.php', 'error', 'Course not found');
            }

            $filePath = null;
            $fileName = null;
            $fileSize = null;

            // Handle file upload
            if ($type === 'file' && isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
                $file = $_FILES['file'];
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

                if (!in_array($ext, $allowedTypes)) {
                    redirect('../../teacher/materials.php', 'error', 'File type not allowed');
                }

                if ($file['size'] > $maxSize) {
                    redirect('../../teacher/materials.php', 'error', 'File too large (max 10MB)');
                }

                $fileName = $file['name'];
                $fileSize = $file['size'];
                $newName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);
                $uploadDir = '../../uploads/materials/' . $courseId . '/';

                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }

                $filePath = 'uploads/materials/' . $courseId . '/' . $newName;

                if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newName)) {
                    redirect('../../teacher/materials.php', 'error', 'Failed to upload file');
                }
            } elseif ($type === 'file') {
                redirect('../../teacher/materials.php', 'error', 'Please select a file to upload');
            }

            // Validate link
            if ($type === 'link' && empty($externalLink)) {
                redirect('../../teacher/materials.php', 'error', 'External link is required');
            }

            // Insert material
            $stmt = $db->prepare("INSERT INTO course_materials 
                (course_id, teacher_id, type, title, description, file_path, file_name, file_size, external_link, due_date, is_pinned)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $courseId,
                $userId,
                $type,
                $title,
                $description ?: null,
                $filePath,
                $fileName,
                $fileSize,
                $externalLink ?: null,
                $dueDate ?: null,
                $isPinned
            ]);

            logAudit($db, $userId, 'create_material', 'course_material', $db->lastInsertId());
            redirect('../../teacher/materials.php', 'success', 'Material added successfully');
            break;

        case 'update':
            $id = $_POST['id'] ?? 0;
            $title = trim($_POST['title'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $externalLink = trim($_POST['external_link'] ?? '');
            $dueDate = $_POST['due_date'] ?? null;
            $isPinned = isset($_POST['is_pinned']) ? 1 : 0;

            // Verify ownership
            $stmt = $db->prepare("SELECT m.id FROM course_materials m 
                JOIN courses c ON m.course_id = c.id 
                WHERE m.id = ? AND c.teacher_id = ?");
            $stmt->execute([$id, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/materials.php', 'error', 'Material not found');
            }

            $stmt = $db->prepare("UPDATE course_materials 
                SET title = ?, description = ?, external_link = ?, due_date = ?, is_pinned = ?
                WHERE id = ?");
            $stmt->execute([$title, $description ?: null, $externalLink ?: null, $dueDate ?: null, $isPinned, $id]);

            logAudit($db, $userId, 'update_material', 'course_material', $id);
            redirect('../../teacher/materials.php', 'success', 'Material updated');
            break;

        case 'delete':
            $id = $_POST['id'] ?? 0;

            // Verify ownership and get file path
            $stmt = $db->prepare("SELECT m.id, m.file_path FROM course_materials m 
                JOIN courses c ON m.course_id = c.id 
                WHERE m.id = ? AND c.teacher_id = ?");
            $stmt->execute([$id, $userId]);
            $material = $stmt->fetch();

            if (!$material) {
                redirect('../../teacher/materials.php', 'error', 'Material not found');
            }

            // Delete file if exists
            if ($material['file_path'] && file_exists('../../' . $material['file_path'])) {
                unlink('../../' . $material['file_path']);
            }

            $stmt = $db->prepare("DELETE FROM course_materials WHERE id = ?");
            $stmt->execute([$id]);

            logAudit($db, $userId, 'delete_material', 'course_material', $id);
            redirect('../../teacher/materials.php', 'success', 'Material deleted');
            break;

        default:
            redirect('../../teacher/materials.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../teacher/materials.php', 'error', 'An error occurred');
}
?>