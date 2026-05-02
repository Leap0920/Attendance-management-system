# Attendance Late System - Flow Diagram

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEACHER SETTINGS                             │
│                      (/teacher/settings)                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Configure Preferences
                                  ▼
                    ┌──────────────────────────┐
                    │  Enable Late System?     │
                    │  ☑ YES  ☐ NO            │
                    └──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                  YES                          NO
                    │                           │
                    ▼                           ▼
        ┌───────────────────────┐   ┌──────────────────────┐
        │ Set Default Threshold │   │ All submissions will │
        │ (e.g., 15 minutes)   │   │ be marked "Present"  │
        └───────────────────────┘   └──────────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  │ Save Settings
                                  ▼
                    ┌──────────────────────────┐
                    │  Settings Saved to DB    │
                    │  (users table)           │
                    └──────────────────────────┘
                                  │
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                      CREATE ATTENDANCE SESSION                       │
│                    (/teacher/attendance)                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Teacher Creates Session
                                  ▼
                    ┌──────────────────────────┐
                    │  Use Custom Threshold?   │
                    │  ☐ YES  ☑ NO            │
                    └──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                  YES                          NO
                    │                           │
                    ▼                           ▼
        ┌───────────────────────┐   ┌──────────────────────┐
        │ Enter Custom Value    │   │ Use Teacher Default  │
        │ (e.g., 45 minutes)   │   │ (from settings)      │
        └───────────────────────┘   └──────────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  │ Create Session
                                  ▼
                    ┌──────────────────────────┐
                    │  Session Created         │
                    │  - attendanceCode        │
                    │  - allowLate (boolean)   │
                    │  - lateMinutes (int)     │
                    └──────────────────────────┘
                                  │
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                      STUDENT SUBMITS ATTENDANCE                      │
│                    (/student/attendance)                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Student Enters Code
                                  ▼
                    ┌──────────────────────────┐
                    │  Verify Code & Session   │
                    └──────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  Check Session Status    │
                    └──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                 ACTIVE                      CLOSED
                    │                           │
                    ▼                           ▼
        ┌───────────────────────┐   ┌──────────────────────┐
        │ Check Submission Time │   │ ❌ Reject Submission │
        └───────────────────────┘   └──────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ After Session End?    │
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
       YES                     NO
        │                       │
        ▼                       ▼
┌──────────────┐    ┌──────────────────────┐
│ ❌ Reject    │    │ Check Late System    │
└──────────────┘    └──────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              allowLate=FALSE         allowLate=TRUE
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌──────────────────────┐
        │ ✅ Mark "Present" │   │ Check Late Threshold │
        └───────────────────┘   └──────────────────────┘
                                            │
                            ┌───────────────┴───────────────┐
                            │                               │
                    Within Threshold                After Threshold
                            │                               │
                            ▼                               ▼
                ┌───────────────────┐         ┌──────────────────┐
                │ ✅ Mark "Present" │         │ ⚠️ Mark "Late"   │
                └───────────────────┘         └──────────────────┘
                            │                               │
                            └───────────────┬───────────────┘
                                            │
                                            ▼
                            ┌──────────────────────────┐
                            │  Save Attendance Record  │
                            │  - status (present/late) │
                            │  - submittedAt           │
                            │  - ipAddress             │
                            └──────────────────────────┘
                                            │
                                            ▼
                            ┌──────────────────────────┐
                            │  Show Confirmation       │
                            │  to Student              │
                            └──────────────────────────┘
```

---

## 📊 Decision Tree

```
START: Student Submits Attendance
│
├─ Is session ACTIVE?
│  ├─ NO → ❌ REJECT (Session closed)
│  └─ YES → Continue
│
├─ Is submission AFTER session end time?
│  ├─ YES → ❌ REJECT (Too late)
│  └─ NO → Continue
│
├─ Is Late System ENABLED (allowLate)?
│  ├─ NO → ✅ PRESENT (Late system disabled)
│  └─ YES → Continue
│
└─ Is submission AFTER late threshold?
   ├─ NO → ✅ PRESENT (Within threshold)
   └─ YES → ⚠️ LATE (After threshold)
```

---

## 🎯 Example Scenarios

### Scenario A: Late System Disabled
```
Teacher Settings:
  allowLate = FALSE

Timeline:
  0:00  Session starts
  0:05  Student A submits → ✅ PRESENT
  0:30  Student B submits → ✅ PRESENT
  0:55  Student C submits → ✅ PRESENT
  1:00  Session ends
  1:05  Student D submits → ❌ REJECTED
```

### Scenario B: 15-Minute Threshold
```
Teacher Settings:
  allowLate = TRUE
  lateMinutes = 15

Timeline:
  0:00  Session starts
  0:10  Student A submits → ✅ PRESENT (within 15 min)
  0:20  Student B submits → ⚠️ LATE (after 15 min)
  0:45  Student C submits → ⚠️ LATE (after 15 min)
  1:00  Session ends
  1:05  Student D submits → ❌ REJECTED (after end)
```

### Scenario C: 45-Minute Override
```
Teacher Settings:
  allowLate = TRUE
  lateMinutes = 15 (default)

Session Override:
  lateMinutes = 45 (custom for this session)

Timeline:
  0:00  Session starts
  0:30  Student A submits → ✅ PRESENT (within 45 min)
  0:50  Student B submits → ⚠️ LATE (after 45 min)
  1:30  Student C submits → ⚠️ LATE (after 45 min)
  2:00  Session ends
  2:05  Student D submits → ❌ REJECTED (after end)
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                        users TABLE                           │
├─────────────────────────────────────────────────────────────┤
│ id                          BIGINT (PK)                      │
│ email                       VARCHAR                          │
│ ...                         (other columns)                  │
│ attendance_late_enabled     BOOLEAN (DEFAULT TRUE)  ← NEW   │
│ attendance_late_minutes     INTEGER (DEFAULT 15)    ← NEW   │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ teacher_id (FK)
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  attendance_sessions TABLE                   │
├─────────────────────────────────────────────────────────────┤
│ id                          BIGINT (PK)                      │
│ teacher_id                  BIGINT (FK → users)              │
│ course_id                   BIGINT (FK → courses)            │
│ attendance_code             VARCHAR                          │
│ start_time                  TIMESTAMP                        │
│ end_time                    TIMESTAMP                        │
│ duration_minutes            INTEGER                          │
│ allow_late                  BOOLEAN                          │
│ late_minutes                INTEGER                          │
│ status                      VARCHAR (active/closed)          │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  │ session_id (FK)
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  attendance_records TABLE                    │
├─────────────────────────────────────────────────────────────┤
│ id                          BIGINT (PK)                      │
│ session_id                  BIGINT (FK → sessions)           │
│ student_id                  BIGINT (FK → users)              │
│ course_id                   BIGINT (FK → courses)            │
│ status                      VARCHAR (present/late/absent)    │
│ submitted_at                TIMESTAMP                        │
│ ip_address                  VARCHAR                          │
│ device_info                 VARCHAR                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    SETTINGS MANAGEMENT                        │
└──────────────────────────────────────────────────────────────┘

GET /api/teacher/settings/attendance
  ↓
  Response: { lateEnabled: true, lateMinutes: 15 }

PUT /api/teacher/settings/attendance
  ↓
  Request: { lateEnabled: false, lateMinutes: 20 }
  ↓
  Response: { success: true, data: {...} }

┌──────────────────────────────────────────────────────────────┐
│                    SESSION CREATION                           │
└──────────────────────────────────────────────────────────────┘

POST /api/teacher/attendance/create
  ↓
  Request: {
    courseId: 1,
    duration: 120,
    lateMinutes: 30  // Optional override
  }
  ↓
  Backend Logic:
    1. Get teacher preferences from users table
    2. Use override if provided, else use teacher default
    3. Create session with calculated values
  ↓
  Response: {
    success: true,
    data: {
      id: 123,
      attendanceCode: "ABC123",
      allowLate: true,
      lateMinutes: 30,
      ...
    }
  }

┌──────────────────────────────────────────────────────────────┐
│                  STUDENT SUBMISSION                           │
└──────────────────────────────────────────────────────────────┘

POST /api/student/attendance/submit
  ↓
  Request: {
    sessionId: 123,
    attendanceCode: "ABC123"
  }
  ↓
  Backend Logic:
    1. Verify session exists and is active
    2. Verify code matches
    3. Check if after session end → REJECT
    4. Check allowLate flag:
       - FALSE → Mark "present"
       - TRUE → Check threshold:
         * Within → Mark "present"
         * After → Mark "late"
    5. Save record
  ↓
  Response: {
    success: true,
    message: "Attendance recorded! You are marked as Present.",
    data: { status: "present", ... }
  }
```

---

## 🎨 UI Component Hierarchy

```
App.tsx
  └─ Route: /teacher/settings
      └─ TeacherSettings.tsx
          └─ DashboardLayout
              └─ Settings Form
                  ├─ Enable Late Toggle
                  ├─ Late Minutes Input
                  ├─ Visual Examples
                  └─ Save Button

App.tsx
  └─ Route: /teacher/attendance
      └─ TeacherAttendance.tsx
          └─ DashboardLayout
              ├─ Stats Cards
              ├─ Active Sessions
              ├─ Sessions Table
              └─ New Session Modal
                  ├─ Course Select
                  ├─ Title Input
                  ├─ Duration Input
                  └─ Late Threshold Section
                      ├─ Custom Override Checkbox
                      ├─ Default Display
                      └─ Custom Input (conditional)
```

---

## 🔄 State Management

```
TeacherSettings Component:
  ├─ loading: boolean
  ├─ saving: boolean
  └─ settings: {
      ├─ lateEnabled: boolean
      └─ lateMinutes: number
    }

TeacherAttendance Component:
  ├─ sessions: Session[]
  ├─ courses: Course[]
  ├─ teacherSettings: {
  │   ├─ lateEnabled: boolean
  │   └─ lateMinutes: number
  │ }
  └─ form: {
      ├─ courseId: string
      ├─ sessionTitle: string
      ├─ duration: string
      ├─ customLate: boolean
      └─ lateMinutes: string
    }
```

---

## 📈 Data Flow Summary

```
1. CONFIGURATION PHASE
   Teacher → Settings Page → API → Database
   (One-time setup, persists)

2. SESSION CREATION PHASE
   Teacher → Attendance Page → API → Database
   (Uses saved settings or override)

3. SUBMISSION PHASE
   Student → Attendance Form → API → Database
   (Applies session's late rules)

4. DISPLAY PHASE
   Teacher → View Records → API → Database
   (Shows final status: present/late/absent)
```

---

This flow diagram shows the complete journey from teacher configuration to student submission, including all decision points and data flows.
