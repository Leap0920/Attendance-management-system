<?php
/**
 * Login API Handler
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    Session::setFlash('error', 'Please fill in all fields.');
    header('Location: ../../index.php');
    exit;
}

try {
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? AND status = 'active'");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !verifyPassword($password, $user['password'])) {
        Session::setFlash('error', 'Invalid email or password.');
        header('Location: ../../index.php');
        exit;
    }

    // Update last login
    $updateStmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
    $updateStmt->execute([$user['id']]);

    // Log the login
    logAudit($db, $user['id'], 'login', 'user', $user['id']);

    // Create session
    Session::create($user);

    // Redirect based on role
    $redirects = [
        'admin' => '../../admin/dashboard.php',
        'teacher' => '../../teacher/dashboard.php',
        'student' => '../../student/dashboard.php'
    ];

    $redirect = $redirects[$user['role']] ?? '../../index.php';
    header("Location: $redirect");
    exit;

} catch (Exception $e) {
    Session::setFlash('error', 'An error occurred. Please try again.');
    header('Location: ../../index.php');
    exit;
}
?>