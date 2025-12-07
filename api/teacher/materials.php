<?php
/**
 * Teacher Materials API - Improved with better error handling
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
$allowedTypes = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'zip', 'rar', 'txt', 'csv'];
$maxSize = 10 * 1024 * 1024; // 10MB

try {
    switch ($action) {
        case 'create':
            $courseId = intval($_POST['course_id'] ?? 0);
            $type = $_POST['type'] ?? 'file';
            $title = trim($_POST['title'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $externalLink = trim($_POST['external_link'] ?? '');
            $dueDate = !empty($_POST['due_date']) ? $_POST['due_date'] : null;
            $isPinned = isset($_POST['is_pinned']) ? 1 : 0;

            // Validate required fields
            if (empty($courseId) || empty($title)) {
                redirect('../../teacher/materials.php', 'error', 'Course and title are required');
            }

            // Verify course ownership
            $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$courseId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/materials.php', 'error', 'Course not found or access denied');
            }

            $filePath = null;
            $fileName = null;
            $fileSize = null;

            // Handle file upload
            if ($type === 'file') {
                if (!isset($_FILES['file']) || $_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) {
                    redirect('../../teacher/materials.php', 'error', 'Please select a file to upload');
                }

                if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                    $errorMessages = [
                        UPLOAD_ERR_INI_SIZE => 'File exceeds server maximum size',
                        UPLOAD_ERR_FORM_SIZE => 'File exceeds form maximum size',
                        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                        UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
                    ];
                    $msg = $errorMessages[$_FILES['file']['error']] ?? 'Unknown upload error';
                    redirect('../../teacher/materials.php', 'error', $msg);
                }

                $file = $_FILES['file'];
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

                if (!in_array($ext, $allowedTypes)) {
                    redirect('../../teacher/materials.php', 'error', 'File type not allowed. Allowed: ' . implode(', ', $allowedTypes));
                }

                if ($file['size'] > $maxSize) {
                    redirect('../../teacher/materials.php', 'error', 'File too large (max 10MB)');
                }

                $fileName = $file['name'];
                $fileSize = $file['size'];
                $newName = time() . '_' . uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $fileName);

                // Create upload directory
                $uploadDir = '../../uploads/materials/' . $courseId . '/';
                if (!is_dir($uploadDir)) {
                    if (!mkdir($uploadDir, 0755, true)) {
                        redirect('../../teacher/materials.php', 'error', 'Failed to create upload directory');
                    }
                }

                $filePath = 'uploads/materials/' . $courseId . '/' . $newName;

                if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newName)) {
                    redirect('../../teacher/materials.php', 'error', 'Failed to upload file. Please try again.');
                }
            }

            // Validate link
            if ($type === 'link') {
                if (empty($externalLink)) {
                    redirect('../../teacher/materials.php', 'error', 'External link is required for link type');
                }
                // Add https if no protocol specified
                if (!preg_match('/^https?:\/\//', $externalLink)) {
                    $externalLink = 'https://' . $externalLink;
                }
            }

            // Insert material
            $stmt = $db->prepare("INSERT INTO course_materials 
                (course_id, teacher_id, type, title, description, file_path, file_name, file_size, external_link, due_date, is_pinned, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([
                $courseId,
                $userId,
                $type,
                $title,
                $description ?: null,
                $filePath,
                $fileName,
                $fileSize,
                $type === 'link' ? $externalLink : null,
                $dueDate,
                $isPinned
            ]);

            $materialId = $db->lastInsertId();
            logAudit($db, $userId, 'create_material', 'course_material', $materialId);

            $typeLabels = ['file' => 'File', 'link' => 'Link', 'announcement' => 'Announcement', 'assignment' => 'Assignment'];
            redirect('../../teacher/materials.php', 'success', $typeLabels[$type] . ' "' . $title . '" added successfully!');
            break;

        case 'update':
            $id = intval($_POST['id'] ?? 0);
            $title = trim($_POST['title'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $externalLink = trim($_POST['external_link'] ?? '');
            $dueDate = !empty($_POST['due_date']) ? $_POST['due_date'] : null;
            $isPinned = isset($_POST['is_pinned']) ? 1 : 0;

            if (empty($title)) {
                redirect('../../teacher/materials.php', 'error', 'Title is required');
            }

            // Verify ownership
            $stmt = $db->prepare("SELECT m.id, m.type FROM course_materials m 
                JOIN courses c ON m.course_id = c.id 
                WHERE m.id = ? AND c.teacher_id = ?");
            $stmt->execute([$id, $userId]);
            $material = $stmt->fetch();

            if (!$material) {
                redirect('../../teacher/materials.php', 'error', 'Material not found');
            }

            // Add https if no protocol specified for links
            if ($material['type'] === 'link' && !empty($externalLink) && !preg_match('/^https?:\/\//', $externalLink)) {
                $externalLink = 'https://' . $externalLink;
            }

            $stmt = $db->prepare("UPDATE course_materials 
                SET title = ?, description = ?, external_link = ?, due_date = ?, is_pinned = ?, updated_at = NOW()
                WHERE id = ?");
            $stmt->execute([$title, $description ?: null, $externalLink ?: null, $dueDate, $isPinned, $id]);

            logAudit($db, $userId, 'update_material', 'course_material', $id);
            redirect('../../teacher/materials.php', 'success', 'Material updated successfully');
            break;

        case 'delete':
            $id = intval($_POST['id'] ?? 0);

            // Verify ownership and get file path
            $stmt = $db->prepare("SELECT m.id, m.file_path, m.title FROM course_materials m 
                JOIN courses c ON m.course_id = c.id 
                WHERE m.id = ? AND c.teacher_id = ?");
            $stmt->execute([$id, $userId]);
            $material = $stmt->fetch();

            if (!$material) {
                redirect('../../teacher/materials.php', 'error', 'Material not found');
            }

            // Delete file if exists
            if ($material['file_path']) {
                $fullPath = '../../' . $material['file_path'];
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                }
            }

            $stmt = $db->prepare("DELETE FROM course_materials WHERE id = ?");
            $stmt->execute([$id]);

            logAudit($db, $userId, 'delete_material', 'course_material', $id);
            redirect('../../teacher/materials.php', 'success', '"' . $material['title'] . '" deleted successfully');
            break;

        case 'toggle_pin':
            $id = intval($_POST['id'] ?? 0);

            // Verify ownership
            $stmt = $db->prepare("SELECT m.id, m.is_pinned FROM course_materials m 
                JOIN courses c ON m.course_id = c.id 
                WHERE m.id = ? AND c.teacher_id = ?");
            $stmt->execute([$id, $userId]);
            $material = $stmt->fetch();

            if (!$material) {
                redirect('../../teacher/materials.php', 'error', 'Material not found');
            }

            $newPinned = $material['is_pinned'] ? 0 : 1;
            $stmt = $db->prepare("UPDATE course_materials SET is_pinned = ? WHERE id = ?");
            $stmt->execute([$newPinned, $id]);

            $msg = $newPinned ? 'Material pinned' : 'Material unpinned';
            redirect('../../teacher/materials.php', 'success', $msg);
            break;

        default:
            redirect('../../teacher/materials.php', 'error', 'Invalid action');
    }
} catch (PDOException $e) {
    error_log("Materials API Error: " . $e->getMessage());
    redirect('../../teacher/materials.php', 'error', 'Database error occurred. Please try again.');
} catch (Exception $e) {
    error_log("Materials API Error: " . $e->getMessage());
    redirect('../../teacher/materials.php', 'error', 'An error occurred: ' . $e->getMessage());
}
?>