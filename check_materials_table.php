<?php
require_once 'config/database.php';

echo "<h2>Database Table Check</h2>";

try {
    $db = getDB();

    // Check if course_materials table exists
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "<h3>Tables in Database:</h3><ul>";
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";

    if (in_array('course_materials', $tables)) {
        echo "<p style='color: green;'>✅ course_materials table exists!</p>";

        // Show structure
        $stmt = $db->query("DESCRIBE course_materials");
        echo "<h3>course_materials structure:</h3>";
        echo "<table border='1' cellpadding='5'><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr>";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr><td>{$row['Field']}</td><td>{$row['Type']}</td><td>{$row['Null']}</td><td>{$row['Key']}</td><td>{$row['Default']}</td></tr>";
        }
        echo "</table>";

        // Show count
        $stmt = $db->query("SELECT COUNT(*) FROM course_materials");
        $count = $stmt->fetchColumn();
        echo "<p>Total materials: <strong>$count</strong></p>";
    } else {
        echo "<p style='color: red;'>❌ course_materials table does NOT exist!</p>";
        echo "<p>Creating table now...</p>";

        $sql = "CREATE TABLE course_materials (
            id INT PRIMARY KEY AUTO_INCREMENT,
            course_id INT NOT NULL,
            teacher_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type ENUM('file', 'link', 'announcement', 'assignment') NOT NULL,
            file_path VARCHAR(500) DEFAULT NULL,
            file_name VARCHAR(255) DEFAULT NULL,
            file_size INT DEFAULT NULL,
            external_link VARCHAR(500) DEFAULT NULL,
            due_date DATETIME NULL,
            is_pinned TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_course (course_id),
            INDEX idx_type (type)
        )";

        $db->exec($sql);
        echo "<p style='color: green;'>✅ Table created successfully!</p>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>