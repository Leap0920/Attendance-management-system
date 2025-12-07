<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Get teacher's courses for dropdown
$stmt = $db->prepare("SELECT id, course_code, course_name FROM courses WHERE teacher_id = ? AND status = 'active' ORDER BY course_name");
$stmt->execute([$user['id']]);
$courses = $stmt->fetchAll();

// Filter by course
$courseFilter = $_GET['course'] ?? '';
$typeFilter = $_GET['type'] ?? '';

// Build query for materials
$query = "SELECT m.*, c.course_code, c.course_name 
    FROM course_materials m 
    JOIN courses c ON m.course_id = c.id 
    WHERE c.teacher_id = ?";
$params = [$user['id']];

if ($courseFilter) {
    $query .= " AND m.course_id = ?";
    $params[] = $courseFilter;
}

if ($typeFilter) {
    $query .= " AND m.type = ?";
    $params[] = $typeFilter;
}

$query .= " ORDER BY m.is_pinned DESC, m.created_at DESC";

$stmt = $db->prepare($query);
$stmt->execute($params);
$materials = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Course Materials - AttendEase</title>
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
                        <h1>Course Materials</h1>
                        <p class="text-muted">Upload and manage course content</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openModal('addMaterialModal')">
                            <i class="fas fa-plus"></i> Add Material
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

                <!-- Filters -->
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-body">
                        <form method="GET" class="filter-form">
                            <div class="filter-group">
                                <select name="course" class="form-input">
                                    <option value="">All Courses</option>
                                    <?php foreach ($courses as $c): ?>
                                        <option value="<?php echo $c['id']; ?>" <?php echo $courseFilter == $c['id'] ? 'selected' : ''; ?>>
                                            <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <select name="type" class="form-input">
                                    <option value="">All Types</option>
                                    <option value="file" <?php echo $typeFilter === 'file' ? 'selected' : ''; ?>>Files
                                    </option>
                                    <option value="link" <?php echo $typeFilter === 'link' ? 'selected' : ''; ?>>Links
                                    </option>
                                    <option value="announcement" <?php echo $typeFilter === 'announcement' ? 'selected' : ''; ?>>Announcements</option>
                                    <option value="assignment" <?php echo $typeFilter === 'assignment' ? 'selected' : ''; ?>>Assignments</option>
                                </select>
                                <button type="submit" class="btn btn-primary"><i class="fas fa-filter"></i>
                                    Filter</button>
                                <a href="materials.php" class="btn btn-ghost">Clear</a>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Materials List -->
                <div class="materials-list">
                    <?php foreach ($materials as $m): ?>
                        <div class="material-card <?php echo $m['is_pinned'] ? 'pinned' : ''; ?>">
                            <div class="material-icon" style="background: <?php
                            echo [
                                'file' => 'rgba(66, 133, 244, 0.2)',
                                'link' => 'rgba(52, 168, 83, 0.2)',
                                'announcement' => 'rgba(251, 188, 4, 0.2)',
                                'assignment' => 'rgba(234, 67, 53, 0.2)'
                            ][$m['type']];
                            ?>; color: <?php
                            echo [
                                'file' => 'var(--primary)',
                                'link' => 'var(--success)',
                                'announcement' => 'var(--warning)',
                                'assignment' => 'var(--danger)'
                            ][$m['type']];
                            ?>;">
                                <i class="fas fa-<?php echo [
                                    'file' => 'file-alt',
                                    'link' => 'link',
                                    'announcement' => 'bullhorn',
                                    'assignment' => 'tasks'
                                ][$m['type']]; ?>"></i>
                            </div>
                            <div class="material-content">
                                <div class="material-header">
                                    <h4>
                                        <?php if ($m['is_pinned']): ?><i class="fas fa-thumbtack text-warning"
                                                style="margin-right: 8px;"></i><?php endif; ?>
                                        <?php echo sanitize($m['title']); ?>
                                    </h4>
                                    <span class="badge badge-<?php echo [
                                        'file' => 'primary',
                                        'link' => 'success',
                                        'announcement' => 'warning',
                                        'assignment' => 'danger'
                                    ][$m['type']]; ?>">
                                        <?php echo ucfirst($m['type']); ?>
                                    </span>
                                </div>
                                <p class="material-course"><?php echo sanitize($m['course_code']); ?> -
                                    <?php echo sanitize($m['course_name']); ?></p>
                                <?php if ($m['description']): ?>
                                    <p class="material-description"><?php echo sanitize($m['description']); ?></p>
                                <?php endif; ?>
                                <div class="material-meta">
                                    <span><i class="fas fa-clock"></i>
                                        <?php echo formatDateTime($m['created_at']); ?></span>
                                    <?php if ($m['type'] === 'file' && $m['file_size']): ?>
                                        <span><i class="fas fa-file"></i> <?php echo formatFileSize($m['file_size']); ?></span>
                                    <?php endif; ?>
                                    <?php if ($m['due_date']): ?>
                                        <span class="text-danger"><i class="fas fa-calendar"></i> Due:
                                            <?php echo formatDateTime($m['due_date']); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="material-actions">
                                <?php if ($m['type'] === 'file' && $m['file_path']): ?>
                                    <a href="../<?php echo $m['file_path']; ?>" class="btn btn-ghost btn-sm" download>
                                        <i class="fas fa-download"></i>
                                    </a>
                                <?php elseif ($m['type'] === 'link' && $m['external_link']): ?>
                                    <a href="<?php echo sanitize($m['external_link']); ?>" class="btn btn-ghost btn-sm"
                                        target="_blank">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>
                                <?php endif; ?>
                                <button class="btn btn-ghost btn-sm"
                                    onclick="editMaterial(<?php echo htmlspecialchars(json_encode($m)); ?>)">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm text-danger"
                                    onclick="deleteMaterial(<?php echo $m['id']; ?>)">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if (empty($materials)): ?>
                        <div class="empty-state">
                            <i class="fas fa-folder-open"></i>
                            <h3>No Materials Yet</h3>
                            <p>Add your first course material</p>
                            <button class="btn btn-primary" onclick="openModal('addMaterialModal')">
                                <i class="fas fa-plus"></i> Add Material
                            </button>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </main>
    </div>

    <!-- Add Material Modal -->
    <div class="modal-overlay" id="addMaterialModal">
        <div class="modal modal-lg">
            <div class="modal-header">
                <h3>Add Course Material</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('addMaterialModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/materials.php" method="POST" enctype="multipart/form-data">
                <input type="hidden" name="action" value="create">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Course *</label>
                            <select name="course_id" class="form-input" required>
                                <option value="">Select course...</option>
                                <?php foreach ($courses as $c): ?>
                                    <option value="<?php echo $c['id']; ?>">
                                        <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Type *</label>
                            <select name="type" id="material_type" class="form-input" required
                                onchange="toggleMaterialFields()">
                                <option value="file">File Upload</option>
                                <option value="link">External Link</option>
                                <option value="announcement">Announcement</option>
                                <option value="assignment">Assignment</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" name="title" class="form-input" placeholder="Material title" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea name="description" class="form-input" rows="3"
                            placeholder="Brief description..."></textarea>
                    </div>

                    <div class="form-group" id="file_field">
                        <label class="form-label">Upload File</label>
                        <input type="file" name="file" class="form-input"
                            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.zip">
                        <small class="text-muted">Max 10MB. Allowed: PDF, PPT, DOC, XLS, Images, MP4, ZIP</small>
                    </div>

                    <div class="form-group" id="link_field" style="display: none;">
                        <label class="form-label">External URL</label>
                        <input type="url" name="external_link" class="form-input" placeholder="https://...">
                    </div>

                    <div class="form-group" id="due_date_field" style="display: none;">
                        <label class="form-label">Due Date</label>
                        <input type="datetime-local" name="due_date" class="form-input">
                    </div>

                    <label class="checkbox-wrapper">
                        <input type="checkbox" name="is_pinned" value="1">
                        <span>Pin this material (shows at top)</span>
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('addMaterialModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Material</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Material Modal -->
    <div class="modal-overlay" id="editMaterialModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Material</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('editMaterialModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/materials.php" method="POST">
                <input type="hidden" name="action" value="update">
                <input type="hidden" name="id" id="edit_material_id">
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Title *</label>
                        <input type="text" name="title" id="edit_material_title" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea name="description" id="edit_material_description" class="form-input"
                            rows="3"></textarea>
                    </div>
                    <div class="form-group" id="edit_link_field">
                        <label class="form-label">External URL</label>
                        <input type="url" name="external_link" id="edit_material_link" class="form-input">
                    </div>
                    <div class="form-group" id="edit_due_field">
                        <label class="form-label">Due Date</label>
                        <input type="datetime-local" name="due_date" id="edit_material_due" class="form-input">
                    </div>
                    <label class="checkbox-wrapper">
                        <input type="checkbox" name="is_pinned" id="edit_material_pinned" value="1">
                        <span>Pin this material</span>
                    </label>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost"
                        onclick="closeModal('editMaterialModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        function toggleMaterialFields() {
            const type = document.getElementById('material_type').value;
            document.getElementById('file_field').style.display = type === 'file' ? 'block' : 'none';
            document.getElementById('link_field').style.display = type === 'link' ? 'block' : 'none';
            document.getElementById('due_date_field').style.display = type === 'assignment' ? 'block' : 'none';
        }

        function editMaterial(material) {
            document.getElementById('edit_material_id').value = material.id;
            document.getElementById('edit_material_title').value = material.title;
            document.getElementById('edit_material_description').value = material.description || '';
            document.getElementById('edit_material_link').value = material.external_link || '';
            document.getElementById('edit_material_due').value = material.due_date ? material.due_date.slice(0, 16) : '';
            document.getElementById('edit_material_pinned').checked = material.is_pinned == 1;

            document.getElementById('edit_link_field').style.display = material.type === 'link' ? 'block' : 'none';
            document.getElementById('edit_due_field').style.display = material.type === 'assignment' ? 'block' : 'none';

            openModal('editMaterialModal');
        }

        function deleteMaterial(id) {
            if (confirm('Delete this material?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '../api/teacher/materials.php';
                form.innerHTML = `<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${id}">`;
                document.body.appendChild(form);
                form.submit();
            }
        }
    </script>
    <style>
        .materials-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .material-card {
            display: flex;
            align-items: flex-start;
            gap: 20px;
            padding: 20px;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            transition: var(--transition);
        }

        .material-card:hover {
            background: var(--bg-card);
        }

        .material-card.pinned {
            border-left: 3px solid var(--warning);
        }

        .material-icon {
            width: 48px;
            height: 48px;
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }

        .material-content {
            flex: 1;
            min-width: 0;
        }

        .material-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 4px;
        }

        .material-header h4 {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
        }

        .material-course {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .material-description {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.5;
        }

        .material-meta {
            display: flex;
            gap: 20px;
            font-size: 12px;
            color: var(--text-muted);
        }

        .material-meta span {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .material-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        .filter-form .filter-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .filter-form .form-input {
            width: auto;
            min-width: 180px;
        }

        .modal-lg {
            max-width: 600px;
        }
    </style>
</body>

</html>