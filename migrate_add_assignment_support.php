<?php
/**
 * Migration: add is_closed to course_materials and create assignment_submissions table
 */
require_once 'config/database.php';
$db = getDB();

try {
    // add is_closed column if not exists
    $stmt = $db->query("SHOW COLUMNS FROM course_materials LIKE 'is_closed'");
    if ($stmt->rowCount() == 0) {
        $db->exec("ALTER TABLE course_materials ADD COLUMN is_closed TINYINT(1) DEFAULT 0 AFTER is_pinned");
        echo "Added is_closed column to course_materials<br>";
    } else {
        echo "is_closed column already exists<br>";
    }

    // create assignment_submissions table if not exists
    $stmt = $db->query("SHOW TABLES LIKE 'assignment_submissions'");
    if ($stmt->rowCount() == 0) {
        $db->exec("CREATE TABLE assignment_submissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            material_id INT NOT NULL,
            student_id INT NOT NULL,
            file_path VARCHAR(500) DEFAULT NULL,
            file_name VARCHAR(255) DEFAULT NULL,
            file_size INT DEFAULT NULL,
            content TEXT DEFAULT NULL,
            status ENUM('submitted','graded','late') DEFAULT 'submitted',
            grade VARCHAR(50) DEFAULT NULL,
            feedback TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES course_materials(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_material (material_id),
            INDEX idx_student (student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        echo "Created assignment_submissions table<br>";
    } else {
        echo "assignment_submissions table already exists<br>";
    }

    echo "<br><strong style='color: green;'>Migration complete!</strong><br>";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}

?>
