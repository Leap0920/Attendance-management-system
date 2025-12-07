<?php
/**
 * User Registration API
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../register.php', 'error', 'Invalid request');
}

$firstName = trim($_POST['first_name'] ?? '');
$lastName = trim($_POST['last_name'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$role = $_POST['role'] ?? 'student';
$studentId = trim($_POST['student_id'] ?? '');

// Validation
if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
    redirect('../../register.php', 'error', 'All required fields must be filled');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    redirect('../../register.php', 'error', 'Please enter a valid email address');
}

if (strlen($password) < 6) {
    redirect('../../register.php', 'error', 'Password must be at least 6 characters');
}

if (!in_array($role, ['student', 'teacher'])) {
    $role = 'student';
}

try {
    $db = getDB();

    // Check if email exists
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        redirect('../../register.php', 'error', 'Email already registered. Please sign in.');
    }

    // Create user
    $stmt = $db->prepare("INSERT INTO users (first_name, last_name, email, password, role, student_id, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        hashPassword($password),
        $role,
        $studentId ?: null
    ]);

    $userId = $db->lastInsertId();
    logAudit($db, $userId, 'register', 'user', $userId);

    Session::setFlash('success', 'Account created successfully! Please sign in.');
    header('Location: ../../index.php');
    exit;

} catch (Exception $e) {
    redirect('../../register.php', 'error', 'An error occurred. Please try again.');
}
?>