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

// Build materials query
$query = "SELECT m.*, c.course_code, c.course_name, c.cover_color, u.first_name, u.last_name
    FROM course_materials m
    JOIN courses c ON m.course_id = c.id
    JOIN users u ON m.teacher_id = u.id
    JOIN enrollments e ON e.course_id = c.id
    WHERE e.student_id = ? AND e.status = 'active'";
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
                        <h1>Course Materials</h1>
                        <p class="text-muted">Access learning resources from your courses</p>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-body">
                        <form method="GET" class="filter-form">
                            <div class="filter-group">
                                <select name="course" class="form-input" onchange="this.form.submit()">
                                    <option value="">All Courses</option>
                                    <?php foreach ($courses as $c): ?>
                                        <option value="<?php echo $c['id']; ?>" <?php echo $selectedCourse == $c['id'] ? 'selected' : ''; ?>>
                                            <?php echo sanitize($c['course_code'] . ' - ' . $c['course_name']); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <select name="type" class="form-input" onchange="this.form.submit()">
                                    <option value="">All Types</option>
                                    <option value="file" <?php echo $selectedType === 'file' ? 'selected' : ''; ?>>Files
                                    </option>
                                    <option value="link" <?php echo $selectedType === 'link' ? 'selected' : ''; ?>>Links
                                    </option>
                                    <option value="announcement" <?php echo $selectedType === 'announcement' ? 'selected' : ''; ?>>Announcements</option>
                                    <option value="assignment" <?php echo $selectedType === 'assignment' ? 'selected' : ''; ?>>Assignments</option>
                                </select>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Materials Grid -->
                <div class="materials-grid">
                    <?php foreach ($materials as $m):
                        $iconMap = [
                            'file' => 'fa-file-alt',
                            'link' => 'fa-link',
                            'announcement' => 'fa-bullhorn',
                            'assignment' => 'fa-tasks'
                        ];
                        $colorMap = [
                            'file' => '#4285F4',
                            'link' => '#9C27B0',
                            'announcement' => '#FBBC04',
                            'assignment' => '#EA4335'
                        ];
                        ?>
                        <div class="material-card <?php echo $m['is_pinned'] ? 'pinned' : ''; ?>">
                            <?php if ($m['is_pinned']): ?>
                                <div class="pin-badge"><i class="fas fa-thumbtack"></i></div>
                            <?php endif; ?>
                            <div class="material-icon"
                                style="background: <?php echo $colorMap[$m['type']]; ?>20; color: <?php echo $colorMap[$m['type']]; ?>;">
                                <i class="fas <?php echo $iconMap[$m['type']]; ?>"></i>
                            </div>
                            <div class="material-content">
                                <div class="material-course" style="color: <?php echo $m['cover_color']; ?>;">
                                    <?php echo sanitize($m['course_code']); ?>
                                </div>
                                <h4><?php echo sanitize($m['title']); ?></h4>
                                <?php if ($m['description']): ?>
                                    <p class="material-desc"><?php echo sanitize($m['description']); ?></p>
                                <?php endif; ?>
                                <div class="material-meta">
                                    <span><i class="fas fa-user"></i>
                                        <?php echo sanitize($m['first_name'] . ' ' . $m['last_name']); ?></span>
                                    <span><i class="fas fa-clock"></i> <?php echo timeAgo($m['created_at']); ?></span>
                                </div>
                                <?php if ($m['due_date']): ?>
                                    <div class="due-date <?php echo strtotime($m['due_date']) < time() ? 'overdue' : ''; ?>">
                                        <i class="fas fa-calendar-alt"></i> Due: <?php echo formatDateTime($m['due_date']); ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                            <div class="material-action">
                                <?php if ($m['type'] === 'file' && $m['file_path']): ?>
                                    <a href="../<?php echo $m['file_path']; ?>" class="btn btn-primary btn-sm" download>
                                        <i class="fas fa-download"></i> Download
                                    </a>
                                <?php elseif ($m['type'] === 'link' && $m['external_link']): ?>
                                    <a href="<?php echo sanitize($m['external_link']); ?>" class="btn btn-primary btn-sm"
                                        target="_blank">
                                        <i class="fas fa-external-link-alt"></i> Open Link
                                    </a>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <?php if (empty($materials)): ?>
                        <div class="empty-state">
                            <i class="fas fa-folder-open"></i>
                            <h3>No Materials Yet</h3>
                            <p>No course materials available. Check back later!</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </main>
    </div>
    <script src="../assets/js/dashboard.js"></script>
    <style>
        .filter-form .filter-group {
            display: flex;
            gap: 12px;
        }

        .filter-form .form-input {
            width: auto;
            min-width: 180px;
        }

        .materials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }

        .material-card {
            background: var(--bg-glass);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            padding: 20px;
            position: relative;
            transition: var(--transition);
        }

        .material-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .material-card.pinned {
            border-color: var(--warning);
            background: rgba(251, 188, 4, 0.05);
        }

        .pin-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            color: var(--warning);
        }

        .material-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-bottom: 16px;
        }

        .material-content {
            flex: 1;
        }

        .material-course {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .material-content h4 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .material-desc {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .material-meta {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 12px;
        }

        .material-meta i {
            margin-right: 4px;
        }

        .due-date {
            font-size: 12px;
            padding: 6px 10px;
            background: rgba(234, 67, 53, 0.1);
            border-radius: 6px;
            color: var(--danger);
            display: inline-block;
            margin-bottom: 12px;
        }

        .due-date.overdue {
            background: var(--danger);
            color: white;
        }

        .material-action {
            margin-top: 16px;
        }

        .empty-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
            background: var(--bg-glass);
            border: 2px dashed var(--border-color);
            border-radius: var(--radius);
        }

        .empty-state i {
            font-size: 48px;
            color: var(--text-muted);
            margin-bottom: 16px;
        }
    </style>
</body>

</html>