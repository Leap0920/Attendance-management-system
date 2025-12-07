<?php
require_once 'config/database.php';
$db = getDB();
$stmt = $db->query('SELECT id, email, first_name, last_name, role, status FROM users ORDER BY id');

echo "<h2>All Users in Database</h2>";
echo "<table border='1' cellpadding='8' cellspacing='0' style='border-collapse: collapse;'>";
echo "<tr style='background:#333;color:#fff;'><th>ID</th><th>Email</th><th>Name</th><th>Role</th><th>Status</th></tr>";

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "<tr>";
    echo "<td>" . $row['id'] . "</td>";
    echo "<td>" . $row['email'] . "</td>";
    echo "<td>" . $row['first_name'] . " " . $row['last_name'] . "</td>";
    echo "<td>" . $row['role'] . "</td>";
    echo "<td>" . $row['status'] . "</td>";
    echo "</tr>";
}
echo "</table>";
echo "<p style='margin-top:20px;'><strong>Default Password:</strong> password (hashed with bcrypt)</p>";
?>