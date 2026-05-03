# AttendEase LMS - Attendance Management System

A modern, web-based Learning Management System focused on attendance tracking, inspired by Google Classroom.

![AttendEase](https://img.shields.io/badge/Version-1.0-blue) ![Java](https://img.shields.io/badge/Java-17+-orange) ![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-green) ![React](https://img.shields.io/badge/React-19-blue)

---

## 📦 Available Versions

| Version | Tech Stack | Status |
|---------|------------|--------|
| **Modern (Recommended)** | Spring Boot 3.2 + React 19 + PostgreSQL | ✅ Active |
| **Legacy** | PHP 8.0 + MySQL | ⚠️ Old |

This README covers the **Modern version**. For the legacy PHP version, see [legacy-php/](legacy-php/).

---

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
- Upload course materials
- Grade assignment submissions

### 🧑‍🎓 Student Dashboard
- Join courses using class codes
- Submit attendance with time-sensitive codes
- View personal attendance records
- Track attendance rate per course
- Download course materials
- Submit assignments

### 🎯 Core Attendance System
- **Unique, time-sensitive codes** (configurable 5-60 minutes)
- Real-time countdown timers
- Automatic late marking
- Anti-fraud measures (one submission per session)
- Automatic absent marking when session closes

### 💬 Messaging
- Direct user-to-user messaging
- Course-specific discussions
- Soft delete for messages

---

## 🛠️ Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.2.5 |
| Language | Java 17 |
| Database | PostgreSQL 17 |
| ORM | Hibernate / Spring Data JPA |
| Security | Spring Security + JWT |
| Migrations | Flyway |
| Authentication | JWT (Access + Refresh tokens) |
| MFA | TOTP (Google Authenticator) |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite 5 |
| Routing | React Router v7 |
| HTTP Client | Axios |
| Styling | CSS |

---

## 📋 Requirements

### For Modern Version
- Java JDK 17+
- PostgreSQL 17+
- Node.js 20+ (for frontend)
- Maven 3.9+ (or use included wrapper)

### For Legacy Version (Deprecated)
- XAMPP (or similar with Apache + PHP + MySQL)
- PHP 8.0+
- MySQL 5.7+

---

## 🛠️ Installation

### Modern Version (Recommended)

#### 1. Database Setup
```powershell
# Install PostgreSQL 17 if not already installed
# Create database
CREATE DATABASE attendease_db;
```

#### 2. Backend Setup
```powershell
cd backend

# Run with Maven wrapper (auto-installs Maven)
.\mvnw.cmd spring-boot:run

# Or with Maven installed
mvn spring-boot:run
```

The backend will:
- Connect to PostgreSQL at `localhost:5432/attendease_db`
- Run Flyway migrations automatically
- Seed demo data on first run
- Start on http://localhost:8080

#### 3. Frontend Setup
```powershell
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on http://localhost:5173

---

### Legacy Version (Deprecated)

#### 1. Place in XAMPP htdocs
```
C:\xampp\htdocs\Attendance-management-system\
```

#### 2. Create Database
1. Start XAMPP (Apache + MySQL)
2. Open phpMyAdmin: http://localhost/phpmyadmin
3. Create database `attendance_lms`
4. Import `database/schema.sql`

#### 3. Run Setup
```bash
php setup.php
```

#### 4. Access
```
http://localhost/Attendance-management-system/
```

---

## 🔐 Security Features

### Modern Version
| Feature | Implementation |
|---------|----------------|
| Authentication | JWT Access + Refresh tokens |
| Password Hashing | BCrypt |
| Role-based Access | ADMIN, TEACHER, STUDENT |
| MFA | TOTP (Google Authenticator) |
| Rate Limiting | 5 attempts → 15 min lockout |
| Token Expiry | Access: 15 min, Refresh: 7 days |
| Cookie Security | HttpOnly, Secure flags |
| Audit Logging | Full action tracking |

### Legacy Version
- Password hashing with bcrypt
- Session management with timeout
- CSRF protection
- Input sanitization
- Role-based access control

---

## 📁 Project Structure

```
Attendance-management-system/
├── backend/                    # Spring Boot API
│   ├── src/main/java/
│   │   └── com/attendease/
│   │       ├── config/         # Security, CORS, JPA config
│   │       ├── controller/     # REST API controllers
│   │       ├── entity/         # JPA entities
│   │       ├── repository/     # Data repositories
│   │       ├── service/        # Business logic
│   │       ├── security/       # JWT auth filter & provider
│   │       ├── dto/            # Data transfer objects
│   │       └── exception/      # Custom exceptions
│   ├── src/main/resources/
│   │   ├── application.yml     # App configuration
│   │   └── db/migration/       # Flyway migrations
│   └── pom.xml                 # Maven dependencies
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── api/               # Axios API client
│   │   ├── assets/            # Auth context, protected routes
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   │   ├── admin/         # Admin pages
│   │   │   ├── teacher/       # Teacher pages
│   │   │   ├── student/       # Student pages
│   │   │   └── auth/          # Login, register
│   │   ├── styles/            # CSS files
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utility functions
│   ├── package.json
│   └── vite.config.ts
│
├── legacy-php/                 # Deprecated PHP version
│   ├── admin/                 # Admin dashboard
│   ├── teacher/               # Teacher dashboard
│   ├── student/               # Student dashboard
│   ├── api/                   # PHP API endpoints
│   ├── config/                # Database config
│   ├── database/              # SQL schema
│   └── assets/                # CSS, JS
│
└── README.md
```

---

## 📝 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/{id}` | Update user |
| DELETE | `/api/admin/users/{id}` | Delete user |
| GET | `/api/admin/audit-logs` | View audit logs |

### Teacher
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teacher/courses` | List my courses |
| POST | `/api/teacher/courses` | Create course |
| POST | `/api/teacher/attendance/session` | Start attendance |
| POST | `/api/teacher/attendance/close/{id}` | Close session |
| POST | `/api/teacher/materials` | Upload material |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/courses` | List enrolled courses |
| POST | `/api/student/attendance/submit` | Submit attendance |
| GET | `/api/student/attendance/history` | View attendance |
| GET | `/api/student/materials/{courseId}` | Download materials |

---

## 🎨 Design Features

- **Modern dark theme** with glassmorphism aesthetics
- Responsive design for all devices
- Smooth animations and micro-interactions
- Google Classroom-inspired UI/UX

---

## 📄 License

This project is open source and available under the MIT License.

---

- Java, Spring Boot, React, and PostgreSQL

to run the ngrok 
npx ngrok http 5173
