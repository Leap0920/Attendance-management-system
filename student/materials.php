<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('student');
$user = Session::getUser();
$db = getDB();

// Get enrolled courses
$stmt = $db->prepare("SELECT c.id, c.course_code, c.course_name, c.cover_color
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE e.student_id = ? AND e.status = 'active' AND c.status = 'active'
    ORDER BY c.course_name");
$stmt->execute([$user['id']]);
$courses = $stmt->fetchAll();

$selectedCourse = $_GET['course'] ?? '';
$selectedType = $_GET['type'] ?? '';

// Build materials query - get materials from enrolled courses
$query = "SELECT m.*, c.course_code, c.course_name, c.cover_color, 
    CONCAT(u.first_name, ' ', u.last_name) as teacher_name
    FROM course_materials m
    JOIN courses c ON m.course_id = c.id
    JOIN users u ON m.teacher_id = u.id
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.student_id = ? AND e.status = 'active' AND c.status = 'active'";
$params = [$user['id']];

if ($selectedCourse) {
    $query .= " AND m.course_id = ?";
    $params[] = $selectedCourse;
}
if ($selectedType) {
    $query .= " AND m.type = ?";
    $params[] = $selectedType;
}

$query .= " ORDER BY m.is_pinned DESC, m.created_at DESC";

$stmt = $db->prepare($query);
$stmt->execute($params);
$materials = $stmt->fetchAll();

// Type icons and colors
$typeIcons = ['file' => 'fa-file-alt', 'link' => 'fa-link', 'announcement' => 'fa-bullhorn', 'assignment' => 'fa-tasks'];
$typeColors = [
    'file' => '#4285F4',
    'link' => '#9C27B0',
    'announcement' => '#FBBC04',
    'assignment' => '#EA4335'
];
$typeLabels = ['file' => 'File', 'link' => 'Link', 'announcement' => 'Announcement', 'assignment' => 'Assignment'];

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
</head>

<body>
    <div class="dashboard-layout">
        <?php include 'includes/sidebar.php'; ?>

        <main class="main-content">
            <?php include 'includes/header.php'; ?>

            <div class="content-wrapper">
                <div class="page-header">
                    <div>
                        <h1><i class="fas fa-book-open" style="margin-right: 12px; color: var(--primary);"></i>Course Materials</h1>
                        <p class="text-muted">Access learning resources from your enrolled courses</p>
                    </div>
                </div>

                <?php if ($flash): ?>
                    <div class="alert alert-<?php echo $flash['type'] === 'error' ? 'error' : 'success'; ?>">
                        <i class="fas fa-<?php echo $flash['type'] === 'success' ? 'check-circle' : 'exclamation-circle'; ?>"></i>
                        <?php echo $flash['message']; ?>
                    </div>
                <?php endif; ?>

                <!-- Quick Stats -->
                <div class="quick-stats">
                    <div class="quick-stat">
                        <i class="fas fa-folder" style="color: var(--primary);"></i>
                        <span><strong><?php echo count($materials); ?></strong> Total Materials</span>
                    </div>
                    <div class="quick-stat">
                        <i class="fas fa-graduation-cap" style="color: var(--success);"></i>
                        <span><strong><?php echo count($courses); ?></strong> Enrolled Courses</span>
                    </div>
                    <?php 
                    $pendingAssignments = array_filter($materials, fn($m) => $m['type'] === 'assignment' && $m['due_date'] && strtotime($m['due_date']) > time());
                    if (count($pendingAssignments) > 0):
                    ?>
                    <div class="quick-stat alert-stat">
                        <i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>
                        <span><strong><?php echo count($pendingAssignments); ?></strong> Pending Assignments</span>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Filters -->
                <div class="card filter-card">
                    <div class="card-body">
                        <form method="GET" class="filter-form">
                            <div class="filter-group">
                                <div class="filter-item">
                                    <label>Course</label>
                                    <select name="course" class="form-input" onchange="this.form.submit()">
                                        <option value="">All Courses</option>
                                        <?php foreach ($courses as $c): ?>
                                            <option value="<?php echo $c['id']; ?>" <?php echo $selectedCourse == $c['id'] ? 'selected' : ''; ?>>
                                                <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                                <div class="filter-item">
                                    <label>Type</label>
                                    <select name="type" class="form-input" onchange="this.form.submit()">
                                        <option value="">All Types</option>
                                        <option value="file" <?php echo $selectedType === 'file' ? 'selected' : ''; ?>>📁 Files</option>
                                        <option value="link" <?php echo $selectedType === 'link' ? 'selected' : ''; ?>>🔗 Links</option>
                                        <option value="announcement" <?php echo $selectedType === 'announcement' ? 'selected' : ''; ?>>📢 Announcements</option>
                                        <option value="assignment" <?php echo $selectedType === 'assignment' ? 'selected' : ''; ?>>📝 Assignments</option>
                                    </select>
                                </div>
                                <?php if ($selectedCourse || $selectedType): ?>
                                <a href="materials.php" class="btn btn-ghost btn-sm">
                                    <i class="fas fa-times"></i> Clear Filters
                                </a>
                                <?php endif; ?>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Materials List -->
                <?php if (empty($materials)): ?>
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <h3>No Materials Available</h3>
                        <p>
                            <?php if (empty($courses)): ?>
                                You're not enrolled in any courses yet. Join a course to access materials.
                            <?php else: ?>
                                No materials have been shared in your courses yet. Check back later!
                            <?php endif; ?>
                        </p>
                    </div>
                <?php else: ?>
                    <div class="materials-list">
                        <?php foreach ($materials as $m): 
                            $isOverdue = $m['due_date'] && strtotime($m['due_date']) < time();
                        ?>
                            <div class="material-item <?php echo $m['is_pinned'] ? 'pinned' : ''; ?> <?php echo $isOverdue ? 'overdue' : ''; ?>" 
                                 onclick="viewMaterial(<?php echo htmlspecialchars(json_encode($m)); ?>)">
                                <?php if ($m['is_pinned']): ?>
                                    <div class="pin-indicator" title="Pinned by teacher"><i class="fas fa-thumbtack"></i></div>
                                <?php endif; ?>
                                
                                <div class="material-type-icon" style="background: <?php echo $typeColors[$m['type']]; ?>;">
                                    <i class="fas <?php echo $typeIcons[$m['type']]; ?>"></i>
                                </div>
                                
                                <div class="material-info">
                                    <div class="material-course-tag" style="background: <?php echo $m['cover_color'] ?: 'var(--primary)'; ?>20; color: <?php echo $m['cover_color'] ?: 'var(--primary)'; ?>;">
                                        <?php echo sanitize($m['course_code']); ?>
                                    </div>
                                    <h3 class="material-title"><?php echo sanitize($m['title']); ?></h3>
                                    
                                    <?php if ($m['description']): ?>
                                        <p class="material-desc"><?php echo sanitize(substr($m['description'], 0, 150)); ?><?php echo strlen($m['description']) > 150 ? '...' : ''; ?></p>
                                    <?php endif; ?>
                                    
                                    <div class="material-meta">
                                        <span><i class="fas fa-user"></i> <?php echo sanitize($m['teacher_name']); ?></span>
                                        <span><i class="fas fa-clock"></i> <?php echo timeAgo($m['created_at']); ?></span>
                                        <span class="type-badge" style="background: <?php echo $typeColors[$m['type']]; ?>20; color: <?php echo $typeColors[$m['type']]; ?>;">
                                            <i class="fas <?php echo $typeIcons[$m['type']]; ?>"></i> <?php echo $typeLabels[$m['type']]; ?>
                                        </span>
                                        <?php if ($m['type'] === 'file' && $m['file_size']): ?>
                                            <span><i class="fas fa-file"></i> <?php echo formatFileSize($m['file_size']); ?></span>
                                        <?php endif; ?>
                                    </div>
                                    
                                    <?php if ($m['due_date']): ?>
                                        <div class="due-badge <?php echo $isOverdue ? 'overdue' : ''; ?>">
                                            <i class="fas fa-calendar-alt"></i> 
                                            <?php echo $isOverdue ? 'OVERDUE: ' : 'Due: '; ?>
                                            <?php echo formatDateTime($m['due_date']); ?>
                                        </div>
                                    <?php endif; ?>
                                </div>
                                
                                <div class="material-action-btn">
                                    <?php if ($m['type'] === 'file' && $m['file_path']): ?>
                                        <a href="../<?php echo $m['file_path']; ?>" class="btn btn-primary" download onclick="event.stopPropagation();">
                                            <i class="fas fa-download"></i> Download
                                        </a>
                                    <?php elseif ($m['type'] === 'link' && $m['external_link']): ?>
                                        <a href="<?php echo sanitize($m['external_link']); ?>" class="btn btn-primary" target="_blank" rel="noopener" onclick="event.stopPropagation();">
                                            <i class="fas fa-external-link-alt"></i> Open Link
                                        </a>
                                    <?php else: ?>
                                        <button class="btn btn-primary">
                                            <i class="fas fa-eye"></i> View Details
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </main>
    </div>
    
    <!-- Material Detail Modal -->
    <div class="modal-overlay" id="materialDetailModal">
        <div class="modal modal-lg">
            <div class="modal-header">
                <div class="modal-title-area">
                    <span class="modal-type-badge" id="modal_type_badge"></span>
                    <h3 id="modal_title"></h3>
                </div>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('materialDetailModal')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="modal-course-info" id="modal_course"></div>
                
                <div class="modal-content-section">
                    <h4><i class="fas fa-info-circle"></i> Description</h4>
                    <p id="modal_description"></p>
                </div>
                
                <div class="modal-meta-grid">
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <div>
                            <label>Posted by</label>
                            <span id="modal_teacher"></span>
                        </div>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <label>Posted on</label>
                            <span id="modal_date"></span>
                        </div>
                    </div>
                    <div class="meta-item" id="modal_due_container" style="display: none;">
                        <i class="fas fa-calendar-check"></i>
                        <div>
                            <label>Due Date</label>
                            <span id="modal_due" class="due-text"></span>
                        </div>
                    </div>
                    <div class="meta-item" id="modal_file_container" style="display: none;">
                        <i class="fas fa-file"></i>
                        <div>
                            <label>File</label>
                            <span id="modal_file"></span>
                        </div>
                    </div>
                </div>
                
                <div id="modal_action_area" class="modal-action-area"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" onclick="closeModal('materialDetailModal')">Close</button>
            </div>
        </div>
    </div>
    
    <script src="../assets/js/dashboard.js"></script>
    <script>
        const typeColors = {
            'file': '#4285F4',
            'link': '#9C27B0',
            'announcement': '#FBBC04',
            'assignment': '#EA4335'
        };
        
        const typeIcons = {
            'file': 'fa-file-alt',
            'link': 'fa-link',
            'announcement': 'fa-bullhorn',
            'assignment': 'fa-tasks'
        };
        
        const typeLabels = {
            'file': 'File',
            'link': 'Link',
            'announcement': 'Announcement',
            'assignment': 'Assignment'
        };
        
        function viewMaterial(material) {
            // Set type badge
            document.getElementById('modal_type_badge').innerHTML = 
                '<i class="fas ' + typeIcons[material.type] + '"></i> ' + typeLabels[material.type];
            document.getElementById('modal_type_badge').style.background = typeColors[material.type] + '20';
            document.getElementById('modal_type_badge').style.color = typeColors[material.type];
            
            // Set basic info
            document.getElementById('modal_title').textContent = material.title;
            document.getElementById('modal_course').innerHTML = 
                '<i class="fas fa-book"></i> ' + material.course_code + ' - ' + material.course_name;
            document.getElementById('modal_description').textContent = material.description || 'No description provided.';
            document.getElementById('modal_teacher').textContent = material.teacher_name;
            document.getElementById('modal_date').textContent = new Date(material.created_at).toLocaleString();
            
            // Due date
            if (material.due_date) {
                document.getElementById('modal_due_container').style.display = 'flex';
                const dueDate = new Date(material.due_date);
                const isOverdue = dueDate < new Date();
                document.getElementById('modal_due').textContent = dueDate.toLocaleString();
                document.getElementById('modal_due').className = 'due-text' + (isOverdue ? ' overdue' : '');
            } else {
                document.getElementById('modal_due_container').style.display = 'none';
            }
            
            // File info
            if (material.type === 'file' && material.file_name) {
                document.getElementById('modal_file_container').style.display = 'flex';
                const sizeKB = material.file_size ? (material.file_size / 1024).toFixed(1) + ' KB' : '';
                document.getElementById('modal_file').textContent = material.file_name + (sizeKB ? ' (' + sizeKB + ')' : '');
            } else {
                document.getElementById('modal_file_container').style.display = 'none';
            }
            
            // Action area
            let actionHtml = '';
            if (material.type === 'file' && material.file_path) {
                actionHtml = '<a href="../' + material.file_path + '" class="btn btn-primary btn-lg" download>' +
                    '<i class="fas fa-download"></i> Download File</a>';
            } else if (material.type === 'link' && material.external_link) {
                actionHtml = '<a href="' + material.external_link + '" class="btn btn-primary btn-lg" target="_blank" rel="noopener">' +
                    '<i class="fas fa-external-link-alt"></i> Open Link</a>';
            } else if (material.type === 'announcement') {
                actionHtml = '<div class="announcement-notice"><i class="fas fa-bullhorn"></i> This is an announcement from your teacher. Please read the details above.</div>';
            } else if (material.type === 'assignment') {
                actionHtml = '<div class="assignment-notice"><i class="fas fa-tasks"></i> This is an assignment. Please follow your teacher\'s instructions.</div>';
                if (material.due_date) {
                    const dueDate = new Date(material.due_date);
                    const isOverdue = dueDate < new Date();
                    if (isOverdue) {
                        actionHtml += '<div class="overdue-warning"><i class="fas fa-exclamation-triangle"></i> This assignment is past due!</div>';
                    }
                }
            }
            document.getElementById('modal_action_area').innerHTML = actionHtml;
            
            openModal('materialDetailModal');
        }
    </script>
    <style>
        .quick-stats {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .quick-stat {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            font-size: 14px;
        }

        .quick-stat.alert-stat {
            background: rgba(251, 188, 4, 0.1);
            border-color: rgba(251, 188, 4, 0.3);
        }

        .filter-card { margin-bottom: 24px; }
        
        .filter-form .filter-group {
            display: flex;
            gap: 16px;
            align-items: flex-end;
            flex-wrap: wrap;
        }

        .filter-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .filter-item label {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .filter-item .form-input {
            width: auto;
            min-width: 200px;
        }

        /* Materials List Style */
        .materials-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .material-item {
            display: flex;
            align-items: flex-start;
            gap: 20px;
            padding: 24px;
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }

        .material-item:hover {
            background: var(--bg-card);
            border-color: var(--primary);
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .material-item.pinned {
            border-left: 4px solid var(--warning);
            background: linear-gradient(to right, rgba(251, 188, 4, 0.05), transparent);
        }

        .material-item.overdue {
            border-left: 4px solid var(--danger);
        }

        .pin-indicator {
            position: absolute;
            top: 12px;
            right: 12px;
            color: var(--warning);
            font-size: 14px;
        }

        .material-type-icon {
            width: 56px;
            height: 56px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            flex-shrink: 0;
        }

        .material-info {
            flex: 1;
            min-width: 0;
        }

        .material-course-tag {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .material-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .material-desc {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.5;
        }

        .material-meta {
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: var(--text-muted);
            flex-wrap: wrap;
            align-items: center;
        }

        .material-meta span {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .type-badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 500;
        }

        .due-badge {
            margin-top: 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            background: rgba(234, 67, 53, 0.1);
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            color: var(--danger);
        }

        .due-badge.overdue {
            background: var(--danger);
            color: white;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .material-action-btn {
            flex-shrink: 0;
            align-self: center;
        }

        .material-action-btn .btn {
            white-space: nowrap;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 80px 20px;
            background: var(--bg-glass);
            border: 2px dashed var(--border-color);
            border-radius: var(--radius);
        }

        .empty-state .empty-icon {
            width: 80px;
            height: 80px;
            background: rgba(66, 133, 244, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
        }

        .empty-state .empty-icon i {
            font-size: 36px;
            color: var(--primary);
        }

        /* Modal Styles */
        .modal-lg { max-width: 650px; }
        
        .modal-title-area {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .modal-type-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .modal-course-info {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            background: var(--bg-glass);
            border-radius: var(--radius);
            margin-bottom: 20px;
            font-weight: 500;
            color: var(--primary);
        }
        
        .modal-content-section {
            margin-bottom: 24px;
        }
        
        .modal-content-section h4 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: var(--text-muted);
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .modal-content-section p {
            font-size: 15px;
            line-height: 1.7;
            color: var(--text-primary);
            white-space: pre-wrap;
        }
        
        .modal-meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            padding: 20px;
            background: var(--bg-glass);
            border-radius: var(--radius);
            margin-bottom: 24px;
        }
        
        .meta-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }
        
        .meta-item > i {
            width: 36px;
            height: 36px;
            background: rgba(66, 133, 244, 0.1);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
            flex-shrink: 0;
        }
        
        .meta-item div label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--text-muted);
            margin-bottom: 2px;
        }
        
        .meta-item div span {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .due-text.overdue {
            color: var(--danger) !important;
            font-weight: 600 !important;
        }
        
        .modal-action-area {
            text-align: center;
        }
        
        .modal-action-area .btn-lg {
            padding: 14px 32px;
            font-size: 16px;
        }
        
        .announcement-notice, .assignment-notice {
            padding: 16px 20px;
            background: rgba(251, 188, 4, 0.1);
            border-radius: var(--radius);
            color: var(--warning);
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        }
        
        .assignment-notice {
            background: rgba(234, 67, 53, 0.1);
            color: var(--danger);
        }
        
        .overdue-warning {
            margin-top: 12px;
            padding: 12px 16px;
            background: var(--danger);
            color: white;
            border-radius: var(--radius);
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
        }

        @media (max-width: 768px) {
            .material-item {
                flex-direction: column;
            }
            
            .material-action-btn {
                width: 100%;
                margin-top: 16px;
            }
            
            .material-action-btn .btn {
                width: 100%;
                justify-content: center;
            }
            
            .modal-meta-grid {
                grid-template-columns: 1fr;
            }
            
            .filter-item .form-input {
                min-width: 100%;
            }
        }
    </style>
</body>

</html>