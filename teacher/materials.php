<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('teacher');
$user = Session::getUser();
$db = getDB();

// Check if the course_materials table has the is_closed column (migration may not have been run)
try {
    $colCheck = $db->prepare("SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_materials' AND COLUMN_NAME = 'is_closed'");
    $colCheck->execute();
    $colRow = $colCheck->fetch();
    $hasIsClosed = $colRow && intval($colRow['cnt']) > 0;
} catch (Exception $e) {
    // If the check fails for any reason, be conservative and treat as missing
    $hasIsClosed = false;
}
    
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

// Count by type
$typeStats = ['file' => 0, 'link' => 0, 'announcement' => 0, 'assignment' => 0];
foreach ($materials as $m) {
    $typeStats[$m['type']]++;
}

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
                        <p class="text-muted">Upload and manage course content for your students</p>
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

                <!-- Stats Cards -->
                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(66, 133, 244, 0.2);"><i class="fas fa-file-alt"
                                style="color: var(--primary);"></i></div>
                        <div class="stat-info">
                            <span class="stat-value"><?php echo $typeStats['file']; ?></span>
                            <span class="stat-label">Files</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(52, 168, 83, 0.2);"><i class="fas fa-link"
                                style="color: var(--success);"></i></div>
                        <div class="stat-info">
                            <span class="stat-value"><?php echo $typeStats['link']; ?></span>
                            <span class="stat-label">Links</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(251, 188, 4, 0.2);"><i class="fas fa-bullhorn"
                                style="color: var(--warning);"></i></div>
                        <div class="stat-info">
                            <span class="stat-value"><?php echo $typeStats['announcement']; ?></span>
                            <span class="stat-label">Announcements</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(234, 67, 53, 0.2);"><i class="fas fa-tasks"
                                style="color: var(--danger);"></i></div>
                        <div class="stat-info">
                            <span class="stat-value"><?php echo $typeStats['assignment']; ?></span>
                            <span class="stat-label">Assignments</span>
                        </div>
                    </div>
                </div>

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
                                <?php if ($courseFilter || $typeFilter): ?>
                                    <a href="materials.php" class="btn btn-ghost">Clear</a>
                                <?php endif; ?>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Materials List -->
                <div class="materials-list">
                    <?php foreach ($materials as $m):
                        $typeColors = [
                            'file' => ['bg' => 'rgba(66, 133, 244, 0.2)', 'color' => 'var(--primary)'],
                            'link' => ['bg' => 'rgba(52, 168, 83, 0.2)', 'color' => 'var(--success)'],
                            'announcement' => ['bg' => 'rgba(251, 188, 4, 0.2)', 'color' => 'var(--warning)'],
                            'assignment' => ['bg' => 'rgba(234, 67, 53, 0.2)', 'color' => 'var(--danger)']
                        ];
                        $typeIcons = ['file' => 'file-alt', 'link' => 'link', 'announcement' => 'bullhorn', 'assignment' => 'tasks'];
                        ?>
                        <div class="material-card <?php echo $m['is_pinned'] ? 'pinned' : ''; ?>">
                            <div class="material-icon"
                                style="background: <?php echo $typeColors[$m['type']]['bg']; ?>; color: <?php echo $typeColors[$m['type']]['color']; ?>;">
                                <i class="fas fa-<?php echo $typeIcons[$m['type']]; ?>"></i>
                            </div>
                            <div class="material-content">
                                <div class="material-header">
                                    <h4>
                                        <?php if ($m['is_pinned']): ?><i class="fas fa-thumbtack text-warning"
                                                style="margin-right: 8px;"></i><?php endif; ?>
                                        <?php echo sanitize($m['title']); ?>
                                    </h4>
                                    <span
                                        class="badge badge-<?php echo ['file' => 'primary', 'link' => 'success', 'announcement' => 'warning', 'assignment' => 'danger'][$m['type']]; ?>">
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
                                    <?php if ($m['type'] === 'file' && $m['file_name']): ?>
                                        <span><i class="fas fa-paperclip"></i> <?php echo sanitize($m['file_name']); ?></span>
                                    <?php endif; ?>
                                    <?php if ($m['due_date']): ?>
                                        <span class="text-danger"><i class="fas fa-calendar"></i> Due:
                                            <?php echo formatDateTime($m['due_date']); ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <div class="material-actions">
                                <?php if ($m['type'] === 'file' && $m['file_path']): ?>
                                    <a href="../<?php echo $m['file_path']; ?>" class="btn btn-ghost btn-sm" download
                                        title="Download">
                                        <i class="fas fa-download"></i>
                                    </a>
                                <?php elseif ($m['type'] === 'link' && $m['external_link']): ?>
                                    <a href="<?php echo sanitize($m['external_link']); ?>" class="btn btn-ghost btn-sm"
                                        target="_blank" title="Open Link">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>
                                <?php endif; ?>
                                <button class="btn btn-ghost btn-sm" onclick="togglePin(<?php echo $m['id']; ?>)"
                                    title="<?php echo $m['is_pinned'] ? 'Unpin' : 'Pin'; ?>">
                                    <i class="fas fa-thumbtack <?php echo $m['is_pinned'] ? 'text-warning' : ''; ?>"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm" onclick="viewMaterialTeacher(<?php echo json_encode($m, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT); ?>)" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <?php if ($m['type'] === 'assignment' && $hasIsClosed): 
                                    // Prepare strings to avoid complex inline PHP inside attributes
                                    $closeTitle = isset($m['is_closed']) && $m['is_closed'] ? 'Reopen assignment' : 'Close assignment';
                                    $closeIcon = isset($m['is_closed']) && $m['is_closed'] ? 'lock-open' : 'lock';
                                ?>
                                    <button class="btn btn-ghost btn-sm" onclick="toggleClose(<?php echo (int)$m['id']; ?>)"
                                        title="<?php echo sanitize($closeTitle); ?>">
                                        <i class="fas fa-<?php echo sanitize($closeIcon); ?>"></i>
                                    </button>
                                    <button class="btn btn-ghost btn-sm" onclick="viewSubmissions(<?php echo (int)$m['id']; ?>)"
                                        title="View Submissions">
                                        <i class="fas fa-folder-open"></i>
                                    </button>
                                <?php endif; ?>
                                <button class="btn btn-ghost btn-sm"
                                    onclick="editMaterial(<?php echo json_encode($m, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT); ?>)" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm text-danger"
                                    onclick="deleteMaterial(<?php echo $m['id']; ?>, '<?php echo addslashes($m['title']); ?>')"
                                    title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if (empty($materials)): ?>
                        <div class="empty-state">
                            <i class="fas fa-folder-open"></i>
                            <h3>No Materials Yet</h3>
                            <p>Add your first course material to share with students</p>
                            <button class="btn btn-primary" onclick="openModal('addMaterialModal')">
                                <i class="fas fa-plus"></i> Add Material
                            </button>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </main>
    </div>
    
    <!-- Submissions Modal -->
    <div class="modal-overlay" id="submissionsModal">
        <div class="modal modal-lg">
            <div class="modal-header">
                <h3>Assignment Submissions</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('submissionsModal')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" id="submissionsModalBody">
                <div id="submissionsLoading">Loading submissions...</div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" onclick="closeModal('submissionsModal')">Close</button>
            </div>
        </div>
    </div>
    
    <!-- View Material Modal (Teacher) -->
    <div class="modal-overlay" id="viewMaterialModal">
        <div class="modal modal-lg">
            <div class="modal-header">
                <h3 id="view_material_title">Material Details</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('viewMaterialModal')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div id="view_material_course" style="margin-bottom:12px"></div>
                <div id="view_material_description" style="margin-bottom:12px"></div>
                <div id="view_material_meta" style="display:flex; gap:12px; flex-wrap:wrap;"></div>
                <div id="view_material_actions" style="margin-top:12px"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('viewMaterialModal')">Close</button>
            </div>
        </div>
    </div>

    <!-- Add Material Modal -->
    <div class="modal-overlay" id="addMaterialModal">
        <div class="modal modal-lg">
            <div class="modal-header">
                <h3>Add Course Material</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('addMaterialModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/teacher/materials.php" method="POST" enctype="multipart/form-data"
                id="addMaterialForm">
                <input type="hidden" name="action" value="create">
                <div class="modal-body">
                    <?php if (empty($courses)): ?>
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            You need to create a course first before adding materials.
                        </div>
                    <?php else: ?>
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
                                    <option value="file">📁 File Upload</option>
                                    <option value="link">🔗 External Link</option>
                                    <option value="announcement">📢 Announcement</option>
                                    <option value="assignment">📝 Assignment</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Title *</label>
                            <input type="text" name="title" class="form-input" placeholder="e.g., Week 1 Lecture Notes"
                                required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-input" rows="3"
                                placeholder="Brief description of this material..."></textarea>
                        </div>

                        <div class="form-group" id="file_field">
                            <label class="form-label">Upload File *</label>
                            <div class="file-upload-area" onclick="document.getElementById('file_input').click()">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Click to select a file or drag & drop</p>
                                <small>Max 10MB • PDF, DOC, PPT, XLS, Images, MP4, ZIP</small>
                            </div>
                            <input type="file" name="file" id="file_input" class="form-input" style="display: none;"
                                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.zip,.rar,.txt,.csv"
                                onchange="updateFileName(this)">
                            <div id="file_name_display" style="margin-top: 8px; font-size: 14px; color: var(--primary);">
                            </div>
                        </div>

                        <div class="form-group" id="link_field" style="display: none;">
                            <label class="form-label">External URL *</label>
                            <input type="url" name="external_link" class="form-input"
                                placeholder="https://example.com/resource">
                        </div>

                        <div class="form-group" id="due_date_field" style="display: none;">
                            <label class="form-label">Due Date</label>
                            <input type="datetime-local" name="due_date" class="form-input">
                        </div>

                        <label class="checkbox-wrapper">
                            <input type="checkbox" name="is_pinned" value="1">
                            <span>📌 Pin this material (shows at top for students)</span>
                        </label>
                    <?php endif; ?>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('addMaterialModal')">Cancel</button>
                    <?php if (!empty($courses)): ?>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-upload"></i> Add Material
                        </button>
                    <?php endif; ?>
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
                    <div style="margin-top:10px;">
                        <label class="checkbox-wrapper">
                            <input type="checkbox" name="is_closed" id="edit_material_closed" value="1">
                            <span>🔒 Close assignment (students cannot submit)</span>
                        </label>
                    </div>
                    <label class="checkbox-wrapper">
                        <input type="checkbox" name="is_pinned" id="edit_material_pinned" value="1">
                        <span>📌 Pin this material</span>
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
        const hasIsClosed = <?php echo $hasIsClosed ? 'true' : 'false'; ?>;
        function toggleMaterialFields() {
            const type = document.getElementById('material_type').value;
            document.getElementById('file_field').style.display = type === 'file' ? 'block' : 'none';
            document.getElementById('link_field').style.display = type === 'link' ? 'block' : 'none';
            document.getElementById('due_date_field').style.display = type === 'assignment' ? 'block' : 'none';
        }

        function viewMaterialTeacher(material) {
            // store currently viewed material for action handlers
            window.__currentViewedMaterial = material;

            document.getElementById('view_material_title').textContent = material.title || 'Material Details';
            document.getElementById('view_material_course').innerHTML = '<i class="fas fa-book"></i> ' + (material.course_code || '') + ' - ' + (material.course_name || '');
            document.getElementById('view_material_description').textContent = material.description || '';

            // meta
            let meta = '';
            meta += '<div><strong>Type:</strong> ' + (material.type || '') + '</div>';
            meta += '<div><strong>Posted on:</strong> ' + (material.created_at ? new Date(material.created_at).toLocaleString() : '') + '</div>';
            if (material.due_date) meta += '<div><strong>Due:</strong> ' + new Date(material.due_date).toLocaleString() + '</div>';
            if (material.file_name) meta += '<div><strong>File:</strong> ' + escapeHtml(material.file_name) + '</div>';
            document.getElementById('view_material_meta').innerHTML = meta;

            // actions (download/open, edit, toggle close, view submissions)
            let actions = '';
            if (material.type === 'file' && material.file_path) {
                actions += '<a href="../' + material.file_path + '" class="btn btn-primary btn-sm" download><i class="fas fa-download"></i> Download</a> ';
            }
            if (material.type === 'link' && material.external_link) {
                actions += '<a href="' + escapeHtml(material.external_link) + '" class="btn btn-primary btn-sm" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Open Link</a> ';
            }

            // Edit button
            actions += '<button class="btn btn-ghost btn-sm" onclick="editMaterial(window.__currentViewedMaterial)"><i class="fas fa-edit"></i> Edit</button> ';

            // Toggle close (assignments) and view submissions
            if (material.type === 'assignment') {
                if (hasIsClosed) {
                    actions += '<button class="btn btn-ghost btn-sm" onclick="toggleClose(' + (material.id || 0) + ')"><i class="fas fa-lock"></i> Toggle Close</button> ';
                }
                actions += '<button class="btn btn-ghost btn-sm" onclick="viewSubmissions(' + (material.id || 0) + ')"><i class="fas fa-folder-open"></i> View Submissions</button> ';
            }

            document.getElementById('view_material_actions').innerHTML = actions;
            openModal('viewMaterialModal');
        }

        function updateFileName(input) {
            const display = document.getElementById('file_name_display');
            if (input.files.length > 0) {
                const file = input.files[0];
                const size = (file.size / 1024 / 1024).toFixed(2);
                display.innerHTML = '<i class="fas fa-check-circle"></i> ' + file.name + ' (' + size + ' MB)';
            } else {
                display.innerHTML = '';
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            return String(text).replace(/[&<>"'`]/g, function (s) {
                return ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                    '`': '&#96;'
                })[s];
            });
        }

        function editMaterial(material) {
            document.getElementById('edit_material_id').value = material.id;
            document.getElementById('edit_material_title').value = material.title;
            document.getElementById('edit_material_description').value = material.description || '';
            document.getElementById('edit_material_link').value = material.external_link || '';
            document.getElementById('edit_material_due').value = material.due_date ? material.due_date.slice(0, 16) : '';
            document.getElementById('edit_material_pinned').checked = material.is_pinned == 1;
            document.getElementById('edit_material_closed').checked = material.is_closed == 1;

            document.getElementById('edit_link_field').style.display = material.type === 'link' ? 'block' : 'none';
            document.getElementById('edit_due_field').style.display = material.type === 'assignment' ? 'block' : 'none';

            openModal('editMaterialModal');
        }

        function deleteMaterial(id, title) {
            if (confirm('Delete "' + title + '"? This action cannot be undone.')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '../api/teacher/materials.php';
                form.innerHTML = `<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${id}">`;
                document.body.appendChild(form);
                form.submit();
            }
        }

        function togglePin(id) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '../api/teacher/materials.php';
            form.innerHTML = `<input type="hidden" name="action" value="toggle_pin"><input type="hidden" name="id" value="${id}">`;
            document.body.appendChild(form);
            form.submit();
        }

        // Drag and drop support
        const dropArea = document.querySelector('.file-upload-area');
        if (dropArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
            });

            dropArea.addEventListener('drop', function (e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                document.getElementById('file_input').files = files;
                updateFileName(document.getElementById('file_input'));
            }, false);
        }

        function toggleClose(id) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '../api/teacher/materials.php';
            form.innerHTML = `<input type="hidden" name="action" value="toggle_close"><input type="hidden" name="id" value="${id}">`;
            document.body.appendChild(form);
            form.submit();
        }

        async function viewSubmissions(materialId) {
            openModal('submissionsModal');
            const body = document.getElementById('submissionsModalBody');
            body.innerHTML = '<div id="submissionsLoading">Loading submissions...</div>';

            try {
                const res = await fetch(`../api/teacher/submissions.php?material_id=${materialId}`);
                if (!res.ok) throw new Error('Network error');
                const data = await res.json();
                if (!data.success) {
                    body.innerHTML = `<div class="alert alert-error">${data.message || 'Failed to load submissions'}</div>`;
                    return;
                }

                const subs = data.submissions || [];
                if (subs.length === 0) {
                    body.innerHTML = '<p>No submissions yet.</p>';
                    return;
                }

                const list = document.createElement('div');
                list.className = 'submissions-list';
                subs.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'submission-item';
                    item.innerHTML = `
                        <div class="submission-header">
                            <strong>${escapeHtml(s.student_name || 'Unknown')}</strong>
                            <span class="muted">${escapeHtml(s.submitted_at || '')}</span>
                        </div>
                        <div class="submission-body">
                            ${s.file_path ? `<a href="../${s.file_path}" target="_blank" download class="btn btn-ghost btn-sm"><i class="fas fa-download"></i> ${escapeHtml(s.file_name || 'file')}</a>` : ''}
                            ${s.content ? `<div class="submission-text">${escapeHtml(s.content)}</div>` : ''}
                            ${s.grade ? `<div class="submission-grade">Grade: ${escapeHtml(s.grade)}</div>` : ''}
                            ${s.feedback ? `<div class="submission-feedback">Feedback: ${escapeHtml(s.feedback)}</div>` : ''}
                        </div>
                    `;
                    list.appendChild(item);
                });

                body.innerHTML = '';
                body.appendChild(list);
            } catch (err) {
                console.error(err);
                body.innerHTML = '<div class="alert alert-error">Error loading submissions. Please try again later.</div>';
            }
        }
    </script>
    <style>
        .stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
        }

        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .stat-info {
            display: flex;
            flex-direction: column;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
        }

        .stat-label {
            font-size: 13px;
            color: var(--text-muted);
        }

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
            box-shadow: var(--shadow);
        }

        .material-card.pinned {
            border-left: 3px solid var(--warning);
            background: rgba(251, 188, 4, 0.03);
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
            flex-wrap: wrap;
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

        .submissions-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .submission-item {
            padding: 12px;
            border: 1px solid var(--border-color);
            background: var(--bg-glass);
            border-radius: 8px;
        }

        .submission-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            margin-bottom: 8px;
        }

        .submission-body .submission-text {
            margin-top: 8px;
            color: var(--text-secondary);
        }

        .file-upload-area {
            border: 2px dashed var(--border-color);
            border-radius: var(--radius);
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: var(--transition);
        }

        .file-upload-area:hover,
        .file-upload-area.highlight {
            border-color: var(--primary);
            background: rgba(66, 133, 244, 0.05);
        }

        .file-upload-area i {
            font-size: 48px;
            color: var(--text-muted);
            margin-bottom: 12px;
        }

        .file-upload-area p {
            margin: 0 0 8px;
            color: var(--text-secondary);
        }

        .file-upload-area small {
            color: var(--text-muted);
        }

        @media (max-width: 768px) {
            .stats-row {
                grid-template-columns: repeat(2, 1fr);
            }

            .material-card {
                flex-direction: column;
            }

            .material-actions {
                width: 100%;
                justify-content: flex-end;
            }
        }
    </style>
</body>

</html>