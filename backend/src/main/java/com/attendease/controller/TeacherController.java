package com.attendease.controller;

import com.attendease.dto.ApiResponse;
import com.attendease.entity.*;
import com.attendease.exception.BadRequestException;
import com.attendease.exception.ResourceNotFoundException;
import com.attendease.repository.*;
import com.attendease.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherController {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final MessageRepository messageRepository;
    private final CourseMessageRepository courseMessageRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ── Dashboard ──────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(@AuthenticationPrincipal User teacher) {
        List<Course> courses = courseRepository.findByTeacherIdAndStatusNot(teacher.getId(), "deleted");
        Map<String, Object> data = new HashMap<>();
        data.put("courses", courses);
        data.put("totalCourses", courses.size());

        // Active sessions
        List<Map<String, Object>> activeSessions = new ArrayList<>();
        for (Course c : courses) {
            attendanceSessionRepository.findByCourseIdAndStatus(c.getId(), "active").forEach(s -> {
                Map<String, Object> sessionMap = new HashMap<>();
                sessionMap.put("session", s);
                sessionMap.put("courseName", c.getCourseName());
                sessionMap.put("submissions", attendanceRecordRepository.findBySessionId(s.getId()).size());
                sessionMap.put("enrolled", enrollmentRepository.countByCourseIdAndStatus(c.getId(), "active"));
                activeSessions.add(sessionMap);
            });
        }
        data.put("activeSessions", activeSessions);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── Courses CRUD ───────────────────────────────────────────────────
    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<Course>>> getCourses(@AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(
                courseRepository.findByTeacherIdAndStatusNot(teacher.getId(), "deleted")));
    }

    @PostMapping("/courses")
    public ResponseEntity<ApiResponse<Course>> createCourse(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) {

        String joinCode;
        do { joinCode = generateCode(6); } while (courseRepository.existsByJoinCode(joinCode));

        String[] colors = {"#4285F4", "#EA4335", "#FBBC04", "#34A853", "#9C27B0", "#FF5722", "#00BCD4"};
        String coverColor = colors[new Random().nextInt(colors.length)];

        Course course = Course.builder()
                .teacher(teacher)
                .courseCode(body.get("courseCode"))
                .courseName(body.get("courseName"))
                .description(body.get("description"))
                .joinCode(joinCode)
                .section(body.get("section"))
                .schedule(body.get("schedule"))
                .room(body.get("room"))
                .coverColor(coverColor)
                .status("active")
                .build();

        course = courseRepository.save(course);
        auditService.log(teacher, "create_course", "course", course.getId(), request);

        return ResponseEntity.ok(ApiResponse.success("Course created! Join code: " + joinCode, course));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCourseDetail(
            @PathVariable Long id, @AuthenticationPrincipal User teacher) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Map<String, Object> data = new HashMap<>();
        data.put("course", course);
        data.put("enrollments", enrollmentRepository.findByCourseIdAndStatus(id, "active"));
        data.put("materials", courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(id));
        data.put("sessions", attendanceSessionRepository.findByCourseId(id));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Course>> updateCourse(
            @PathVariable Long id, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (body.containsKey("courseCode")) course.setCourseCode(body.get("courseCode"));
        if (body.containsKey("courseName")) course.setCourseName(body.get("courseName"));
        if (body.containsKey("description")) course.setDescription(body.get("description"));
        if (body.containsKey("section")) course.setSection(body.get("section"));
        if (body.containsKey("schedule")) course.setSchedule(body.get("schedule"));
        if (body.containsKey("room")) course.setRoom(body.get("room"));

        course = courseRepository.save(course);
        auditService.log(teacher, "update_course", "course", id, request);
        return ResponseEntity.ok(ApiResponse.success("Course updated", course));
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(
            @PathVariable Long id, @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        course.setStatus("deleted");
        courseRepository.save(course);
        auditService.log(teacher, "delete_course", "course", id, request);
        return ResponseEntity.ok(ApiResponse.success("Course deleted", null));
    }

    // ── Attendance ─────────────────────────────────────────────────────
    @PostMapping("/attendance/create")
    public ResponseEntity<ApiResponse<AttendanceSession>> createSession(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {

        Long courseId = Long.valueOf(body.get("courseId").toString());
        courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (attendanceSessionRepository.existsByCourseIdAndStatus(courseId, "active")) {
            throw new BadRequestException("An active session already exists for this course");
        }

        String code;
        do { code = generateCode(6); }
        while (attendanceSessionRepository.findByAttendanceCodeAndStatus(code, "active").isPresent());

        int duration = body.containsKey("duration") ? Integer.parseInt(body.get("duration").toString()) : 10;
        boolean allowLate = body.containsKey("allowLate") ? Boolean.parseBoolean(body.get("allowLate").toString()) : true;
        LocalDateTime now = LocalDateTime.now();

        AttendanceSession session = AttendanceSession.builder()
                .course(courseRepository.findById(courseId).get())
                .teacher(teacher)
                .sessionTitle(body.containsKey("sessionTitle") ? body.get("sessionTitle").toString() : null)
                .attendanceCode(code)
                .durationMinutes(duration)
                .startTime(now)
                .endTime(now.plusMinutes(duration))
                .status("active")
                .allowLate(allowLate)
                .lateMinutes(5)
                .build();

        session = attendanceSessionRepository.save(session);
        auditService.log(teacher, "create_attendance_session", "attendance_session", session.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Attendance session started! Code: " + code, session));
    }

    @PostMapping("/attendance/{id}/close")
    public ResponseEntity<ApiResponse<Void>> closeSession(
            @PathVariable Long id, @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        AttendanceSession session = attendanceSessionRepository.findById(id)
                .filter(s -> s.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        session.setStatus("closed");
        attendanceSessionRepository.save(session);

        // Mark absent students
        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(session.getCourse().getId(), "active");
        for (Enrollment e : enrollments) {
            if (!attendanceRecordRepository.existsBySessionIdAndStudentId(id, e.getStudent().getId())) {
                AttendanceRecord record = AttendanceRecord.builder()
                        .session(session)
                        .student(e.getStudent())
                        .course(session.getCourse())
                        .status("absent")
                        .build();
                attendanceRecordRepository.save(record);
            }
        }

        auditService.log(teacher, "close_attendance_session", "attendance_session", id, request);
        return ResponseEntity.ok(ApiResponse.success("Session closed", null));
    }

    @PostMapping("/attendance/{id}/extend")
    public ResponseEntity<ApiResponse<AttendanceSession>> extendSession(
            @PathVariable Long id, @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher) {
        AttendanceSession session = attendanceSessionRepository.findById(id)
                .filter(s -> s.getTeacher().getId().equals(teacher.getId()) && "active".equals(s.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Active session not found"));

        int extra = body.containsKey("extraMinutes") ? Integer.parseInt(body.get("extraMinutes").toString()) : 5;
        session.setEndTime(session.getEndTime().plusMinutes(extra));
        session.setDurationMinutes(session.getDurationMinutes() + extra);
        session = attendanceSessionRepository.save(session);
        return ResponseEntity.ok(ApiResponse.success("Session extended by " + extra + " minutes", session));
    }

    @GetMapping("/attendance/sessions")
    public ResponseEntity<ApiResponse<List<AttendanceSession>>> getSessions(@AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(attendanceSessionRepository.findByTeacherId(teacher.getId())));
    }

    @GetMapping("/attendance/records/{sessionId}")
    public ResponseEntity<ApiResponse<List<AttendanceRecord>>> getRecords(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.success(attendanceRecordRepository.findBySessionId(sessionId)));
    }

    @PutMapping("/attendance/records/{id}")
    public ResponseEntity<ApiResponse<AttendanceRecord>> updateRecord(
            @PathVariable Long id, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        AttendanceRecord record = attendanceRecordRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Record not found"));
        if (body.containsKey("status")) record.setStatus(body.get("status"));
        if (body.containsKey("notes")) record.setNotes(body.get("notes"));
        record = attendanceRecordRepository.save(record);
        auditService.log(teacher, "update_attendance_record", "attendance_record", id, request);
        return ResponseEntity.ok(ApiResponse.success("Record updated", record));
    }

    // ── Materials ──────────────────────────────────────────────────────
    @GetMapping("/materials")
    public ResponseEntity<ApiResponse<List<CourseMaterial>>> getMaterials(
            @RequestParam Long courseId, @AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(
                courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(courseId)));
    }

    @PostMapping("/materials")
    public ResponseEntity<ApiResponse<CourseMaterial>> createMaterial(
            @RequestParam Long courseId,
            @RequestParam String type,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String externalLink,
            @RequestParam(required = false) String dueDate,
            @RequestParam(required = false) MultipartFile file,
            @AuthenticationPrincipal User teacher,
            HttpServletRequest request) throws IOException {

        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        CourseMaterial material = CourseMaterial.builder()
                .course(course).teacher(teacher).type(type).title(title)
                .description(description).externalLink(externalLink)
                .dueDate(dueDate != null && !dueDate.isEmpty() ? LocalDateTime.parse(dueDate) : null)
                .isPinned(false).isClosed(false).build();

        // Handle file upload
        if ("file".equals(type) && file != null && !file.isEmpty()) {
            String uploadDir = "uploads/materials/" + courseId;
            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName));
            material.setFilePath(uploadDir + "/" + fileName);
            material.setFileName(file.getOriginalFilename());
            material.setFileSize((int) file.getSize());
        }

        material = courseMaterialRepository.save(material);
        auditService.log(teacher, "create_material", "course_material", material.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Material added", material));
    }

    @DeleteMapping("/materials/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMaterial(
            @PathVariable Long id, @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        CourseMaterial material = courseMaterialRepository.findById(id)
                .filter(m -> m.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        if (material.getFilePath() != null) {
            try { Files.deleteIfExists(Paths.get(material.getFilePath())); } catch (IOException ignored) {}
        }

        courseMaterialRepository.delete(material);
        auditService.log(teacher, "delete_material", "course_material", id, request);
        return ResponseEntity.ok(ApiResponse.success("Material deleted", null));
    }

    // ── Messages ───────────────────────────────────────────────────────
    @PostMapping("/messages/send")
    public ResponseEntity<ApiResponse<Message>> sendMessage(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

        Message msg = Message.builder()
                .sender(teacher).receiver(receiver)
                .subject(body.containsKey("subject") ? body.get("subject").toString() : null)
                .content(body.get("content").toString())
                .build();
        msg = messageRepository.save(msg);
        auditService.log(teacher, "send_dm", "message", msg.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Message sent", msg));
    }

    @PostMapping("/messages/group")
    public ResponseEntity<ApiResponse<CourseMessage>> sendGroupMessage(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Long courseId = Long.valueOf(body.get("courseId").toString());
        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        CourseMessage msg = CourseMessage.builder()
                .course(course).sender(teacher)
                .content(body.get("content").toString())
                .build();
        msg = courseMessageRepository.save(msg);
        return ResponseEntity.ok(ApiResponse.success("Group message sent", msg));
    }

    @PostMapping("/messages/broadcast")
    public ResponseEntity<ApiResponse<Void>> broadcast(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User teacher, HttpServletRequest request) {
        Long courseId = Long.valueOf(body.get("courseId").toString());
        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        String subject = body.containsKey("subject") ? body.get("subject").toString()
                : "[" + course.getCourseName() + "] Announcement";
        String content = body.get("content").toString();

        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, "active");
        for (Enrollment e : enrollments) {
            Message msg = Message.builder()
                    .sender(teacher).receiver(e.getStudent()).course(course)
                    .subject(subject).content(content).build();
            messageRepository.save(msg);
        }

        auditService.log(teacher, "broadcast_message", "course", courseId, request);
        return ResponseEntity.ok(ApiResponse.success("Broadcast sent to " + enrollments.size() + " students", null));
    }

    @GetMapping("/messages/group/{courseId}")
    public ResponseEntity<ApiResponse<List<CourseMessage>>> getGroupMessages(
            @PathVariable Long courseId, @AuthenticationPrincipal User teacher) {
        courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        return ResponseEntity.ok(ApiResponse.success(
                courseMessageRepository.findByCourseIdOrderByCreatedAtAsc(courseId)));
    }

    @GetMapping("/messages/dm")
    public ResponseEntity<ApiResponse<List<Message>>> getDmMessages(
            @RequestParam Long userId, @AuthenticationPrincipal User teacher) {
        return ResponseEntity.ok(ApiResponse.success(
                messageRepository.findConversation(teacher.getId(), userId)));
    }

    // ── Reports ────────────────────────────────────────────────────────
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReport(
            @RequestParam Long courseId, @AuthenticationPrincipal User teacher) {
        Course course = courseRepository.findById(courseId)
                .filter(c -> c.getTeacher().getId().equals(teacher.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        List<AttendanceSession> sessions = attendanceSessionRepository.findByCourseId(courseId);
        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, "active");

        List<Map<String, Object>> studentsData = new ArrayList<>();
        for (Enrollment e : enrollments) {
            User s = e.getStudent();
            long present = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(s.getId(), courseId, "present");
            long late = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(s.getId(), courseId, "late");
            long absent = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(s.getId(), courseId, "absent");

            Map<String, Object> sd = new HashMap<>();
            sd.put("id", s.getId());
            sd.put("name", s.getFullName());
            sd.put("studentId", s.getStudentId());
            sd.put("email", s.getEmail());
            sd.put("present", present);
            sd.put("late", late);
            sd.put("absent", absent);
            long total = present + late + absent;
            sd.put("rate", total > 0 ? Math.round(((double)(present + late) / total) * 1000.0) / 10.0 : 100);
            studentsData.add(sd);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("course", course);
        data.put("students", studentsData);
        data.put("totalSessions", sessions.size());
        data.put("totalStudents", enrollments.size());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── Helpers ────────────────────────────────────────────────────────
    private String generateCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < length; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }
}
