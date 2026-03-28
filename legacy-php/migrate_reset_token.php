<?php
/**
 * Migration: Add reset token columns to users table
 */
require_once 'config/database.php';
$db = getDB();

try {
    // Check if columns exist first
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'reset_token'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN reset_token VARCHAR(64) NULL");
        echo "Added reset_token column<br>";
    } else {
        echo "reset_token column already exists<br>";
    }

    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'reset_token_expiry'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME NULL");
        echo "Added reset_token_expiry column<br>";
    } else {
        echo "reset_token_expiry column already exists<br>";
    }

    echo "<br><strong style='color: green;'>Migration complete!</strong><br><br>";
    echo "<a href='forgot_password.php'>Test Forgot Password</a>";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>