<?php
/**
 * Teacher Courses API
 */
require_once '../../config/database.php';
require_once '../../config/session.php';
require_once '../../includes/functions.php';

Session::requireRole('teacher');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('../../teacher/dashboard.php', 'error', 'Invalid request');
}

$action = $_POST['action'] ?? '';
$db = getDB();
$userId = Session::getUserId();

try {
    switch ($action) {
        case 'create':
            $courseCode = trim($_POST['course_code'] ?? '');
            $courseName = trim($_POST['course_name'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $section = trim($_POST['section'] ?? '');
            $room = trim($_POST['room'] ?? '');
            $schedule = trim($_POST['schedule'] ?? '');

            if (empty($courseCode) || empty($courseName)) {
                redirect('../../teacher/dashboard.php', 'error', 'Course code and name are required');
            }

            // Generate unique join code
            $joinCode = generateJoinCode($db);

            // Random cover color
            $colors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#9C27B0', '#FF5722', '#00BCD4'];
            $coverColor = $colors[array_rand($colors)];

            $stmt = $db->prepare("INSERT INTO courses 
                (teacher_id, course_code, course_name, description, join_code, section, schedule, room, cover_color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $courseCode, $courseName, $description ?: null, $joinCode, $section ?: null, $schedule ?: null, $room ?: null, $coverColor]);

            $courseId = $db->lastInsertId();
            logAudit($db, $userId, 'create_course', 'course', $courseId);

            redirect('../../teacher/dashboard.php', 'success', "Course created! Join code: $joinCode");
            break;

        case 'update':
            $id = $_POST['id'] ?? 0;
            $courseCode = trim($_POST['course_code'] ?? '');
            $courseName = trim($_POST['course_name'] ?? '');
            $description = trim($_POST['description'] ?? '');
            $section = trim($_POST['section'] ?? '');
            $room = trim($_POST['room'] ?? '');
            $schedule = trim($_POST['schedule'] ?? '');

            // Verify ownership
            $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$id, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/dashboard.php', 'error', 'Course not found');
            }

            $stmt = $db->prepare("UPDATE courses SET 
                course_code = ?, course_name = ?, description = ?, section = ?, room = ?, schedule = ?
                WHERE id = ?");
            $stmt->execute([$courseCode, $courseName, $description ?: null, $section ?: null, $room ?: null, $schedule ?: null, $id]);

            logAudit($db, $userId, 'update_course', 'course', $id);
            redirect('../../teacher/course.php?id=' . $id, 'success', 'Course updated');
            break;

        case 'delete':
            $id = $_POST['id'] ?? 0;

            $stmt = $db->prepare("UPDATE courses SET status = 'deleted' WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$id, $userId]);

            logAudit($db, $userId, 'delete_course', 'course', $id);
            redirect('../../teacher/dashboard.php', 'success', 'Course deleted');
            break;

        case 'remove_student':
            $courseId = $_POST['course_id'] ?? 0;
            $studentId = $_POST['student_id'] ?? 0;

            // Verify ownership
            $stmt = $db->prepare("SELECT id FROM courses WHERE id = ? AND teacher_id = ?");
            $stmt->execute([$courseId, $userId]);
            if (!$stmt->fetch()) {
                redirect('../../teacher/dashboard.php', 'error', 'Course not found');
            }

            $stmt = $db->prepare("UPDATE enrollments SET status = 'dropped' WHERE course_id = ? AND student_id = ?");
            $stmt->execute([$courseId, $studentId]);

            redirect('../../teacher/course.php?id=' . $courseId, 'success', 'Student removed');
            break;

        default:
            redirect('../../teacher/dashboard.php', 'error', 'Invalid action');
    }
} catch (Exception $e) {
    redirect('../../teacher/dashboard.php', 'error', 'An error occurred');
}
?>