# Fix Attendance Late Threshold Logic

The user reported that students are marked as "Late" even when entering the class code well within the session duration (e.g., at 70 minutes of a 120-minute session). This is due to a hardcoded 5-minute "Late" threshold in the backend.

## User Review Required

> [!IMPORTANT]
> The current system defaults to **5 minutes** for "Present" status. Anything after that is "Late".
> I will change this so the teacher can specify the threshold.
> What should be the default "Late" threshold if the teacher doesn't specify one? I suggest 15 minutes.

## Proposed Changes

### Backend (Spring Boot)

#### [MODIFY] [TeacherController.java](file:///c:/codes/Attendance-management-system/backend/src/main/java/com/attendease/controller/TeacherController.java)
- Update `createSession` method to accept `lateMinutes` from the request body.
- Update `reopenSession` method to optionally accept `lateMinutes`.
- Use the provided `lateMinutes` or default to 5 (or 15) if not provided.

### Frontend (React)

#### [MODIFY] [TeacherAttendance.tsx](file:///c:/codes/Attendance-management-system/frontend/src/pages/teacher/Attendance.tsx)
- Add a `lateMinutes` field to the `form` state.
- Add an input field for "Late Threshold (minutes)" in the "New Attendance Session" modal.
- Include `lateMinutes` in the API call to `teacherApi.createAttendance`.

## Verification Plan

### Automated Tests
- No automated tests available in the current environment, but I will verify via code inspection and manual walkthrough if possible.

### Manual Verification
1. Create a session with 120m duration and 90m late threshold.
2. Verify that a student submitting at 70m is marked "Present".
3. Verify that a student submitting at 100m is marked "Late".
