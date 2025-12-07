<?php
/**
 * Database Setup Script
 * Run this file AFTER importing schema.sql to set correct demo passwords
 * 
 * Usage: php setup.php
 */

require_once 'config/database.php';

echo "Setting up AttendEase LMS...\n\n";

try {
    $db = getDB();

    // Check if database exists by counting tables
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll();

    if (count($tables) == 0) {
        echo "ERROR: Database tables not found.\n";
        echo "Please import database/schema.sql first using phpMyAdmin or MySQL.\n";
        exit(1);
    }

    echo "Found " . count($tables) . " tables.\n";

    // Generate and set proper password hashes
    $passwords = [
        'admin@lms.com' => 'admin123',
        'teacher@lms.com' => 'teacher123',
        'student1@lms.com' => 'student123',
        'student2@lms.com' => 'student123',
        'student3@lms.com' => 'student123'
    ];

    echo "\nSetting demo account passwords...\n";

    foreach ($passwords as $email => $password) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->execute([$hash, $email]);

        if ($stmt->rowCount() > 0) {
            echo "  ✓ $email => $password\n";
        }
    }

    echo "\n✓ Setup complete!\n\n";
    echo "Demo Accounts:\n";
    echo "  Admin:   admin@lms.com / admin123\n";
    echo "  Teacher: teacher@lms.com / teacher123\n";
    echo "  Student: student1@lms.com / student123\n";
    echo "\nAccess: http://localhost/Attendance-management-system/\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
?>