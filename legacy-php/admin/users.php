<?php
require_once '../config/session.php';
require_once '../config/database.php';
require_once '../includes/functions.php';

Session::requireRole('admin');
$user = Session::getUser();
$db = getDB();

// Get filter parameters
$role = $_GET['role'] ?? '';
$status = $_GET['status'] ?? '';
$search = $_GET['search'] ?? '';

// Build query
$query = "SELECT * FROM users WHERE 1=1";
$params = [];

if ($role) {
    $query .= " AND role = ?";
    $params[] = $role;
}

if ($status) {
    $query .= " AND status = ?";
    $params[] = $status;
}

if ($search) {
    $query .= " AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)";
    $searchTerm = "%$search%";
    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
}

$query .= " ORDER BY created_at DESC";

$stmt = $db->prepare($query);
$stmt->execute($params);
$users = $stmt->fetchAll();

$flash = Session::getFlash();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - AttendEase</title>
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
                        <h1>User Management</h1>
                        <p class="text-muted">Manage all system users</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openModal('addUserModal')">
                            <i class="fas fa-plus"></i> Add User
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
                                <select name="role" class="form-input">
                                    <option value="">All Roles</option>
                                    <option value="admin" <?php echo $role === 'admin' ? 'selected' : ''; ?>>Admin
                                    </option>
                                    <option value="teacher" <?php echo $role === 'teacher' ? 'selected' : ''; ?>>Teacher
                                    </option>
                                    <option value="student" <?php echo $role === 'student' ? 'selected' : ''; ?>>Student
                                    </option>
                                </select>
                                <select name="status" class="form-input">
                                    <option value="">All Status</option>
                                    <option value="active" <?php echo $status === 'active' ? 'selected' : ''; ?>>Active
                                    </option>
                                    <option value="inactive" <?php echo $status === 'inactive' ? 'selected' : ''; ?>>
                                        Inactive</option>
                                    <option value="pending" <?php echo $status === 'pending' ? 'selected' : ''; ?>>Pending
                                    </option>
                                </select>
                                <input type="text" name="search" class="form-input" placeholder="Search users..."
                                    value="<?php echo sanitize($search); ?>">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-filter"></i> Filter
                                </button>
                                <a href="users.php" class="btn btn-ghost">Clear</a>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Users Table -->
                <div class="card">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($users as $u): ?>
                                    <tr>
                                        <td>
                                            <div class="user-info">
                                                <div class="avatar-initials"
                                                    style="background:<?php echo ['admin' => 'var(--danger)', 'teacher' => 'var(--purple)', 'student' => 'var(--success)'][$u['role']]; ?>">
                                                    <?php echo getInitials($u['first_name'], $u['last_name']); ?>
                                                </div>
                                                <span><?php echo sanitize($u['first_name'] . ' ' . $u['last_name']); ?></span>
                                            </div>
                                        </td>
                                        <td><?php echo sanitize($u['email']); ?></td>
                                        <td><span
                                                class="badge badge-<?php echo ['admin' => 'danger', 'teacher' => 'primary', 'student' => 'success'][$u['role']]; ?>"><?php echo ucfirst($u['role']); ?></span>
                                        </td>
                                        <td><?php echo sanitize($u['department'] ?? '-'); ?></td>
                                        <td><span
                                                class="badge badge-<?php echo ['active' => 'success', 'inactive' => 'danger', 'pending' => 'warning'][$u['status']]; ?>"><?php echo ucfirst($u['status']); ?></span>
                                        </td>
                                        <td class="text-muted"><?php echo formatDate($u['created_at']); ?></td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="btn btn-icon btn-ghost"
                                                    onclick="editUser(<?php echo htmlspecialchars(json_encode($u)); ?>)"
                                                    title="Edit">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <?php if ($u['id'] !== $user['id']): ?>
                                                    <button class="btn btn-icon btn-ghost text-danger"
                                                        onclick="deleteUser(<?php echo $u['id']; ?>)" title="Delete">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                <?php endif; ?>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if (empty($users)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center text-muted">No users found</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Add User Modal -->
    <div class="modal-overlay" id="addUserModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Add New User</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('addUserModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/admin/users.php" method="POST">
                <input type="hidden" name="action" value="create">
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">First Name</label><input type="text"
                            name="first_name" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Last Name</label><input type="text"
                            name="last_name" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Email</label><input type="email" name="email"
                            class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Password</label><input type="password"
                            name="password" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Role</label><select name="role"
                            class="form-input">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select></div>
                    <div class="form-group"><label class="form-label">Department</label><input type="text"
                            name="department" class="form-input"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('addUserModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create User</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div class="modal-overlay" id="editUserModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Edit User</h3>
                <button class="btn btn-icon btn-ghost" onclick="closeModal('editUserModal')"><i
                        class="fas fa-times"></i></button>
            </div>
            <form action="../api/admin/users.php" method="POST">
                <input type="hidden" name="action" value="update">
                <input type="hidden" name="id" id="edit_id">
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">First Name</label><input type="text"
                            name="first_name" id="edit_first_name" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Last Name</label><input type="text"
                            name="last_name" id="edit_last_name" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Email</label><input type="email" name="email"
                            id="edit_email" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">New Password (leave blank to keep)</label><input
                            type="password" name="password" class="form-input"></div>
                    <div class="form-group"><label class="form-label">Role</label><select name="role" id="edit_role"
                            class="form-input">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select></div>
                    <div class="form-group"><label class="form-label">Status</label><select name="status"
                            id="edit_status" class="form-input">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending</option>
                        </select></div>
                    <div class="form-group"><label class="form-label">Department</label><input type="text"
                            name="department" id="edit_department" class="form-input"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('editUserModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update User</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../assets/js/dashboard.js"></script>
    <script>
        function editUser(user) {
            document.getElementById('edit_id').value = user.id;
            document.getElementById('edit_first_name').value = user.first_name;
            document.getElementById('edit_last_name').value = user.last_name;
            document.getElementById('edit_email').value = user.email;
            document.getElementById('edit_role').value = user.role;
            document.getElementById('edit_status').value = user.status;
            document.getElementById('edit_department').value = user.department || '';
            openModal('editUserModal');
        }

        function deleteUser(id) {
            if (confirm('Are you sure you want to delete this user?')) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = '../api/admin/users.php';
                form.innerHTML = `<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="${id}">`;
                document.body.appendChild(form);
                form.submit();
            }
        }
    </script>
    <style>
        .filter-form .filter-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .filter-form .form-input {
            width: auto;
            min-width: 150px;
        }

        .action-buttons {
            display: flex;
            gap: 4px;
        }
    </style>
</body>

</html>