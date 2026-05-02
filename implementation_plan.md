# Fix Attendance Late Threshold Logic - Settings-Based Approach

The user reported that students are marked as "Late" even when entering the class code well within the session duration (e.g., at 70 minutes of a 120-minute session). This is due to a hardcoded 5-minute "Late" threshold in the backend.

## Solution Overview

Implement a **teacher-level settings system** where each teacher can:
1. **Enable/Disable** the late marking system entirely
2. **Configure default late threshold** (in minutes) for all their sessions
3. **Override per-session** when creating/reopening attendance sessions

## User Review Required

> [!IMPORTANT]
> **Default Settings (when teacher hasn't configured preferences):**
> - Late System: **Enabled**
> - Default Late Threshold: **15 minutes** (changed from hardcoded 5 minutes)
> 
> **Teacher Can Configure:**
> - Turn off late system completely (all submissions marked "Present")
> - Set their preferred default late threshold (e.g., 10, 15, 20 minutes)
> - Override on a per-session basis when creating attendance

## Proposed Changes

### Backend (Spring Boot)

#### [CREATE] Entity for Teacher Preferences
**Option A: Add columns to User entity** (simpler, recommended)
- Add `attendanceLateEnabled` (Boolean, default: true)
- Add `attendanceLateMinutes` (Integer, default: 15)

**Option B: Create separate TeacherPreference entity** (more scalable)
- Create new entity with user relationship
- Store all teacher preferences in one place

#### [MODIFY] TeacherController.java
**New Endpoints:**
- `GET /api/teacher/settings/attendance` - Get current attendance preferences
- `PUT /api/teacher/settings/attendance` - Update attendance preferences

**Modified Endpoints:**
- `POST /api/teacher/attendance/create` - Accept optional `lateMinutes` override
- `POST /api/teacher/attendance/{id}/reopen` - Accept optional `lateMinutes` override

**Logic Changes:**
- When creating session: Use override → teacher default → system default (15)
- When late system disabled: Always mark as "Present" (never "Late")
- Store `lateMinutes` and `allowLate` in AttendanceSession for reference

#### [MODIFY] StudentController.java
- Update attendance submission logic to respect `allowLate` flag
- If `allowLate = false`, mark all submissions as "Present"
- If `allowLate = true`, use session's `lateMinutes` threshold

### Frontend (React)

#### [CREATE] TeacherSettings.tsx (New Page)
**Location:** `frontend/src/pages/teacher/Settings.tsx`

**Features:**
- Section: "Attendance Preferences"
- Toggle: "Enable Late Marking System"
- Number Input: "Default Late Threshold (minutes)" (only when enabled)
- Save button with API integration
- Display current settings on load

#### [MODIFY] TeacherAttendance.tsx
**New Features:**
- Display teacher's current default late threshold in UI
- Add optional "Late Threshold (minutes)" field in session creation modal
- Show placeholder with teacher's default value
- Add checkbox: "Use custom late threshold for this session"
- When unchecked: Use teacher's default
- When checked: Show input field for override

#### [MODIFY] Navigation/Routing
- Add "Settings" link to teacher navigation menu
- Add route for `/teacher/settings`

### Database Migration

#### [CREATE] Migration Script
**If using Option A (User entity columns):**
```sql
ALTER TABLE users 
ADD COLUMN attendance_late_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN attendance_late_minutes INTEGER DEFAULT 15;
```

**If using Option B (Separate entity):**
```sql
CREATE TABLE teacher_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    attendance_late_enabled BOOLEAN DEFAULT TRUE,
    attendance_late_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

## Implementation Order

1. **Backend - Data Model** (Choose Option A or B)
   - Add columns to User entity OR create TeacherPreference entity
   - Create/update repository if needed

2. **Backend - Settings Endpoints**
   - Add GET/PUT endpoints for attendance preferences
   - Add validation (late minutes must be > 0 and < session duration)

3. **Backend - Session Creation Logic**
   - Update `createSession` to use teacher preferences
   - Update `reopenSession` to use teacher preferences
   - Ensure `allowLate` and `lateMinutes` are stored in session

4. **Backend - Submission Logic**
   - Update StudentController to respect `allowLate` flag
   - Use session's `lateMinutes` for threshold calculation

5. **Frontend - Settings Page**
   - Create Settings.tsx with attendance preferences UI
   - Add API integration for GET/PUT settings
   - Add to navigation menu

6. **Frontend - Session Creation**
   - Update Attendance.tsx to show teacher's defaults
   - Add optional override fields
   - Update API calls to include `lateMinutes` when overridden

## Verification Plan

### Manual Testing Scenarios

**Scenario 1: Default Behavior (No Custom Settings)**
1. Teacher hasn't configured settings
2. Create session with 120m duration
3. Student submits at 10 minutes → "Present"
4. Student submits at 20 minutes → "Late"
5. Expected: 15-minute default threshold applies

**Scenario 2: Teacher Disables Late System**
1. Teacher sets "Enable Late Marking" to OFF
2. Create session with any duration
3. Student submits at any time before session ends
4. Expected: All marked "Present", none marked "Late"

**Scenario 3: Teacher Custom Default (30 minutes)**
1. Teacher sets default late threshold to 30 minutes
2. Create session with 120m duration (no override)
3. Student submits at 25 minutes → "Present"
4. Student submits at 35 minutes → "Late"
5. Expected: 30-minute threshold applies

**Scenario 4: Per-Session Override**
1. Teacher has default of 15 minutes
2. Create session with 120m duration, override to 45 minutes
3. Student submits at 40 minutes → "Present"
4. Student submits at 50 minutes → "Late"
5. Expected: 45-minute override applies for this session only

**Scenario 5: Reopen Session**
1. Reopen existing session without specifying late threshold
2. Expected: Uses original session's late threshold
3. Reopen with new late threshold specified
4. Expected: Uses new threshold

## API Contracts

### GET /api/teacher/settings/attendance
**Response:**
```json
{
  "success": true,
  "data": {
    "lateEnabled": true,
    "lateMinutes": 15
  }
}
```

### PUT /api/teacher/settings/attendance
**Request:**
```json
{
  "lateEnabled": false,
  "lateMinutes": 20
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance preferences updated",
  "data": {
    "lateEnabled": false,
    "lateMinutes": 20
  }
}
```

### POST /api/teacher/attendance/create
**Request (with override):**
```json
{
  "courseId": 1,
  "sessionTitle": "Week 5 Lecture",
  "duration": 120,
  "lateMinutes": 30
}
```

**Request (use teacher default):**
```json
{
  "courseId": 1,
  "sessionTitle": "Week 5 Lecture",
  "duration": 120
}
```
