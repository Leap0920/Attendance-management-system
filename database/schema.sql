-- Attendance Management System Database Schema
-- Run this file to create the database and tables

CREATE DATABASE IF NOT EXISTS attendance_lms;
USE attendance_lms;

-- Set SQL mode for compatibility
SET sql_mode = '';

-- Users Table (Admin, Teacher, Student)
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS course_materials;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student',
    avatar VARCHAR(255) DEFAULT NULL,
    student_id VARCHAR(50) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    reset_token VARCHAR(64) DEFAULT NULL,
    reset_token_expiry DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- Courses/Classrooms Table
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    join_code VARCHAR(10) NOT NULL UNIQUE,
    section VARCHAR(50) DEFAULT NULL,
    schedule VARCHAR(255) DEFAULT NULL,
    room VARCHAR(100) DEFAULT NULL,
    cover_color VARCHAR(7) DEFAULT '#4285F4',
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_teacher (teacher_id),
    INDEX idx_join_code (join_code),
    INDEX idx_status (status)
);

-- Course Enrollments (Student-Course relationship)
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'dropped', 'completed') DEFAULT 'active',
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id),
    INDEX idx_student (student_id),
    INDEX idx_course (course_id)
);

-- Attendance Sessions (Created by Teacher)
CREATE TABLE attendance_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    teacher_id INT NOT NULL,
    session_title VARCHAR(255) DEFAULT NULL,
    attendance_code VARCHAR(10) NOT NULL,
    qr_code_data TEXT,
    duration_minutes INT DEFAULT 10,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('pending', 'active', 'closed', 'expired') DEFAULT 'pending',
    allow_late TINYINT(1) DEFAULT 1,
    late_minutes INT DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_code (attendance_code),
    INDEX idx_status (status),
    INDEX idx_times (start_time, end_time)
);

-- Attendance Records (Student submissions)
CREATE TABLE attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('present', 'late', 'absent', 'excused') DEFAULT 'present',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) DEFAULT NULL,
    device_info VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (session_id, student_id),
    INDEX idx_session (session_id),
    INDEX idx_student (student_id),
    INDEX idx_status (status)
);

-- Course Content/Materials
CREATE TABLE course_materials (
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
    is_closed TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_type (type)
);

-- Assignment Submissions (students submit to assignments)
CREATE TABLE IF NOT EXISTS assignment_submissions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comments/Discussions
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    material_id INT DEFAULT NULL,
    user_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    is_private TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES course_materials(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_material (material_id)
);

-- Private Messages
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    course_id INT DEFAULT NULL,
    subject VARCHAR(255) DEFAULT NULL,
    content TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_read (is_read)
);

-- Course Group Messages (Section Chat)
CREATE TABLE course_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    is_pinned TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course (course_id),
    INDEX idx_created (created_at)
);

-- Audit Log
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT DEFAULT NULL,
    old_values TEXT DEFAULT NULL,
    new_values TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
);

-- System Settings
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin account (password: admin123)
INSERT INTO users (email, password, first_name, last_name, role, status) VALUES
('admin@lms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin', 'active');

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('site_name', 'AttendEase LMS', 'System name'),
('default_attendance_duration', '10', 'Default attendance window duration in minutes'),
('allow_late_attendance', '1', 'Allow late attendance submissions'),
('late_threshold_minutes', '5', 'Minutes after which attendance is marked late'),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', 'pdf,ppt,pptx,doc,docx,xls,xlsx,jpg,png,mp4', 'Allowed file extensions');

-- Create demo teacher account (password: teacher123)
INSERT INTO users (email, password, first_name, last_name, role, department, status) VALUES
('teacher@lms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Smith', 'teacher', 'Computer Science', 'active');

-- Create demo student accounts (password: student123)
INSERT INTO users (email, password, first_name, last_name, role, student_id, department, status) VALUES
('student1@lms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice', 'Johnson', 'student', 'STU001', 'Computer Science', 'active'),
('student2@lms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Williams', 'student', 'STU002', 'Computer Science', 'active'),
('student3@lms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Carol', 'Davis', 'student', 'STU003', 'Information Technology', 'active');

-- Create demo course
INSERT INTO courses (teacher_id, course_code, course_name, description, join_code, section, schedule, room, cover_color) VALUES
(2, 'CS101', 'Introduction to Programming', 'Learn the fundamentals of programming using Python. This course covers variables, loops, functions, and basic data structures.', 'ABC123', 'Section A', 'MWF 9:00 AM - 10:30 AM', 'Room 301', '#4285F4');

-- Enroll demo students in demo course
INSERT INTO enrollments (student_id, course_id) VALUES
(3, 1),
(4, 1),
(5, 1);
