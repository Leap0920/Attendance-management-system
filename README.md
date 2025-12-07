# AttendEase LMS - Attendance Management System

A modern, web-based Learning Management System focused on attendance tracking, inspired by Google Classroom.

![AttendEase](https://img.shields.io/badge/Version-1.0-blue) ![PHP](https://img.shields.io/badge/PHP-8.0+-purple) ![MySQL](https://img.shields.io/badge/MySQL-5.7+-orange)

## 🚀 Features

### 👑 Admin Dashboard
- System overview with comprehensive statistics
- User management (CRUD for Teachers/Students)
- Course management and oversight
- Audit log for system activity tracking

### 👨‍🏫 Teacher Dashboard
- Create and manage courses with unique join codes
- **Time-sensitive attendance sessions** with unique codes
- Real-time attendance tracking
- Student enrollment management
- Attendance reports and export

### 🧑‍🎓 Student Dashboard
- Join courses using class codes
- Submit attendance with time-sensitive codes
- View personal attendance records
- Track attendance rate per course

### 🎯 Core Attendance System
- **Unique, time-sensitive codes** (configurable 5-60 minutes)
- Real-time countdown timers
- Automatic late marking
- Anti-fraud measures (one submission per session)
- Automatic absent marking when session closes

## 📋 Requirements

- XAMPP (or similar with Apache + PHP + MySQL)
- PHP 8.0+
- MySQL 5.7+
- Modern web browser

## 🛠️ Installation

### Step 1: Clone/Download
Place the project in your XAMPP htdocs folder:
```
C:\xampp\htdocs\Attendance-management-system\
```

### Step 2: Create Database
1. Start XAMPP (Apache + MySQL)
2. Open phpMyAdmin: http://localhost/phpmyadmin
3. Create a new database named `attendance_lms`
4. Import the SQL schema:
   - Click on `attendance_lms` database
   - Go to "Import" tab
   - Select file: `database/schema.sql`
   - Click "Go"

### Step 3: Run Setup Script
Run the setup script to initialize demo account passwords:
```bash
cd C:\xampp\htdocs\Attendance-management-system
C:\xampp\php\php.exe setup.php
```

### Step 4: Configure Database (Optional)
If your MySQL credentials differ from default, edit `config/database.php`:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', ''); // Add your password if set
define('DB_NAME', 'attendance_lms');
```

### Step 5: Access the System
Open your browser and navigate to:
```
http://localhost/Attendance-management-system/
```

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lms.com | admin123 |
| Teacher | teacher@lms.com | teacher123 |
| Student | student1@lms.com | student123 |

## 📁 Project Structure

```
Attendance-management-system/
├── admin/              # Admin dashboard pages
├── teacher/            # Teacher dashboard pages
├── student/            # Student dashboard pages
├── api/                # Backend API endpoints
│   ├── auth/           # Authentication APIs
│   ├── admin/          # Admin APIs
│   ├── teacher/        # Teacher APIs
│   └── student/        # Student APIs
├── assets/
│   ├── css/            # Stylesheets
│   └── js/             # JavaScript files
├── config/             # Configuration files
├── database/           # SQL schema
├── includes/           # Helper functions
├── uploads/            # File uploads (materials)
├── index.php           # Login page
└── register.php        # Registration page
```

## 🎨 Design Features

- **Dark glassmorphism theme** with modern aesthetics
- Responsive design for all devices
- Smooth animations and micro-interactions
- Google Classroom-inspired UI/UX

## 📝 Usage Guide

### For Teachers:
1. Login with teacher credentials
2. Create a new course (generates unique join code)
3. Share join code with students
4. Start attendance session (generates time-sensitive code)
5. Display code to students
6. Monitor real-time submissions
7. Close session to auto-mark absents

### For Students:
1. Login with student credentials
2. Join course using teacher's join code
3. When attendance is open, enter the attendance code
4. View attendance history and rates

## 🔒 Security Features

- Password hashing with bcrypt
- Session management with timeout
- CSRF protection
- Input sanitization
- Role-based access control

## 📄 License

This project is open source and available under the MIT License.

---

Built with ❤️ using PHP, MySQL, and modern CSS
