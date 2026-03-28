<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Get audit logs with pagination
$page = max(1, intval($_GET['page'] ?? 1));
$perPage = 50;
$offset = ($page - 1) * $perPage;

$stmt = $db->query("SELECT COUNT(*) as total FROM audit_logs");
$total = $stmt->fetch()['total'];
$totalPages = ceil($total / $perPage);

$stmt = $db->prepare("SELECT al.*, u.first_name, u.last_name, u.email 
    FROM audit_logs al 
    LEFT JOIN users u ON al.user_id = u.id 
    ORDER BY al.created_at DESC 
    LIMIT ? OFFSET ?");
$stmt->execute([$perPage, $offset]);
$logs = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Log - AttendEase</title>
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
                        <h1>Audit Log</h1>
                        <p class="text-muted">System activity history</p>
                    </div>
                </div>

                <div class="card">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>IP Address</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($logs as $log): ?>
                                    <tr>
                                        <td>
                                            <?php if ($log['first_name']): ?>
                                                <div class="user-info">
                                                    <div class="avatar-initials"
                                                        style="width:32px;height:32px;font-size:11px;background:var(--primary);">
                                                        <?php echo getInitials($log['first_name'], $log['last_name']); ?>
                                                    </div>
                                                    <span><?php echo sanitize($log['first_name'] . ' ' . $log['last_name']); ?></span>
                                                </div>
                                            <?php else: ?>
                                                <span class="text-muted">System</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><span
                                                class="badge badge-primary"><?php echo str_replace('_', ' ', ucfirst($log['action'])); ?></span>
                                        </td>
                                        <td><?php echo ucfirst($log['entity_type']); ?>
                                            #<?php echo $log['entity_id'] ?? '-'; ?></td>
                                        <td class="text-muted"><?php echo sanitize($log['ip_address'] ?? '-'); ?></td>
                                        <td class="text-muted"><?php echo formatDateTime($log['created_at']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <?php if ($totalPages > 1): ?>
                        <div class="card-body">
                            <div class="pagination">
                                <?php if ($page > 1): ?>
                                    <a href="?page=<?php echo $page - 1; ?>" class="btn btn-ghost btn-sm"><i
                                            class="fas fa-chevron-left"></i></a>
                                <?php endif; ?>
                                <span class="text-muted">Page <?php echo $page; ?> of <?php echo $totalPages; ?></span>
                                <?php if ($page < $totalPages): ?>
                                    <a href="?page=<?php echo $page + 1; ?>" class="btn btn-ghost btn-sm"><i
                                            class="fas fa-chevron-right"></i></a>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </main>
    </div>
    <script src="../assets/js/dashboard.js"></script>
    <style>
        .pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
        }
    </style>
</body>

</html>