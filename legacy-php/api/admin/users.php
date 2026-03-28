<?php
/**
 * Admin Users API
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../admin/users.php', 'error', 'Invalid request method');
}

$action = $_POST['action'] ?? '';
$db = getDB();

try {
    switch ($action) {
        case 'create':
            $firstName = trim($_POST['first_name'] ?? '');
            $lastName = trim($_POST['last_name'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            $role = $_POST['role'] ?? 'student';
            $department = trim($_POST['department'] ?? '');

            // Validation
            if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
                redirect('../../admin/users.php', 'error', 'All required fields must be filled');
            }

            // Check if email exists
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                redirect('../../admin/users.php', 'error', 'Email already exists');
            }

            // Create user
            $stmt = $db->prepare("INSERT INTO users (first_name, last_name, email, password, role, department, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
            $stmt->execute([$firstName, $lastName, $email, hashPassword($password), $role, $department ?: null]);

            $userId = $db->lastInsertId();
            logAudit($db, Session::getUserId(), 'create_user', 'user', $userId);

            redirect('../../admin/users.php', 'success', 'User created successfully');
            break;

        case 'update':
            $id = $_POST['id'] ?? 0;
            $firstName = trim($_POST['first_name'] ?? '');
            $lastName = trim($_POST['last_name'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            $role = $_POST['role'] ?? 'student';
            $status = $_POST['status'] ?? 'active';
            $department = trim($_POST['department'] ?? '');

            if (empty($id) || empty($firstName) || empty($lastName) || empty($email)) {
                redirect('../../admin/users.php', 'error', 'All required fields must be filled');
            }

            // Check if email exists for another user
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $stmt->execute([$email, $id]);
            if ($stmt->fetch()) {
                redirect('../../admin/users.php', 'error', 'Email already exists');
            }

            // Update user
            if (!empty($password)) {
                $stmt = $db->prepare("UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ?, role = ?, status = ?, department = ? WHERE id = ?");
                $stmt->execute([$firstName, $lastName, $email, hashPassword($password), $role, $status, $department ?: null, $id]);
            } else {
                $stmt = $db->prepare("UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, status = ?, department = ? WHERE id = ?");
                $stmt->execute([$firstName, $lastName, $email, $role, $status, $department ?: null, $id]);
            }

            logAudit($db, Session::getUserId(), 'update_user', 'user', $id);
            redirect('../../admin/users.php', 'success', 'User updated successfully');
            break;

        case 'delete':
            $id = $_POST['id'] ?? 0;

            if ($id == Session::getUserId()) {
                redirect('../../admin/users.php', 'error', 'You cannot delete your own account');
            }

            $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);

            logAudit($db, Session::getUserId(), 'delete_user', 'user', $id);
            redirect('../../admin/users.php', 'success', 'User deleted successfully');
            break;

        default:
            redirect('../../admin/users.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../admin/users.php', 'error', 'An error occurred: ' . $e->getMessage());
}
?>