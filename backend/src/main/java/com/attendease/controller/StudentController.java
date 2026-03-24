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

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final CourseMaterialRepository courseMaterialRepository;
    private final MessageRepository messageRepository;
    private final CourseMessageRepository courseMessageRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ── Dashboard ──────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard(@AuthenticationPrincipal User student) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(student.getId(), "active");
        List<Map<String, Object>> courseData = new ArrayList<>();

        List<Map<String, Object>> activeSessions = new ArrayList<>();

        for (Enrollment e : enrollments) {
            Course course = e.getCourse();
            long total = attendanceRecordRepository.countByStudentIdAndCourseId(student.getId(), course.getId());
            long present = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(student.getId(), course.getId(), "present");
            long late = attendanceRecordRepository.countByStudentIdAndCourseIdAndStatus(student.getId(), course.getId(), "late");

            Map<String, Object> cd = new HashMap<>();
            cd.put("course", course);
            cd.put("totalSessions", total);
            cd.put("presentCount", present + late);
            cd.put("attendanceRate", total > 0 ? Math.round(((double)(present + late) / total) * 1000.0) / 10.0 : 0);
            courseData.add(cd);

            // Check for active sessions
            attendanceSessionRepository.findByCourseIdAndStatus(course.getId(), "active").forEach(s -> {
                boolean alreadySubmitted = attendanceRecordRepository.existsBySessionIdAndStudentId(s.getId(), student.getId());
                Map<String, Object> sm = new HashMap<>();
                sm.put("session", s);
                sm.put("courseName", course.getCourseName());
                sm.put("alreadySubmitted", alreadySubmitted);
                activeSessions.add(sm);
            });
        }

        Map<String, Object> data = new HashMap<>();
        data.put("courses", courseData);
        data.put("activeSessions", activeSessions);
        data.put("totalCourses", enrollments.size());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── Courses ────────────────────────────────────────────────────────
    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCourses(@AuthenticationPrincipal User student) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(student.getId(), "active");
        List<Map<String, Object>> courses = enrollments.stream().map(e -> {
            Map<String, Object> m = new HashMap<>();
            m.put("enrollment", e);
            m.put("course", e.getCourse());
            return m;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(courses));
    }

    @PostMapping("/courses/join")
    public ResponseEntity<ApiResponse<Enrollment>> joinCourse(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User student, HttpServletRequest request) {
        String joinCode = body.get("joinCode");
        Course course = courseRepository.findByJoinCode(joinCode.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid join code"));

        if (enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), course.getId())) {
            throw new BadRequestException("Already enrolled in this course");
        }

        Enrollment enrollment = Enrollment.builder()
                .student(student).course(course).status("active").build();
        enrollment = enrollmentRepository.save(enrollment);
        auditService.log(student, "join_course", "enrollment", enrollment.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Joined course: " + course.getCourseName(), enrollment));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCourseDetail(
            @PathVariable Long id, @AuthenticationPrincipal User student) {
        enrollmentRepository.findByStudentIdAndCourseId(student.getId(), id)
                .filter(e -> "active".equals(e.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled in this course"));

        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Map<String, Object> data = new HashMap<>();
        data.put("course", course);
        data.put("materials", courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(id));
        data.put("attendanceRecords", attendanceRecordRepository.findByStudentIdAndCourseId(student.getId(), id));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    // ── Attendance ─────────────────────────────────────────────────────
    @PostMapping("/attendance/submit")
    public ResponseEntity<ApiResponse<AttendanceRecord>> submitAttendance(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal User student, HttpServletRequest request) {

        Long sessionId = Long.valueOf(body.get("sessionId").toString());
        String code = body.get("attendanceCode").toString().toUpperCase().trim();

        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        // Verify enrollment
        enrollmentRepository.findByStudentIdAndCourseId(student.getId(), session.getCourse().getId())
                .filter(e -> "active".equals(e.getStatus()))
                .orElseThrow(() -> new BadRequestException("Not enrolled in this course"));

        // Check duplicate
        if (attendanceRecordRepository.existsBySessionIdAndStudentId(sessionId, student.getId())) {
            throw new BadRequestException("Already submitted attendance for this session");
        }

        // Verify code
        if (!session.getAttendanceCode().equals(code)) {
            throw new BadRequestException("Invalid attendance code");
        }

        // Check session status
        if (!"active".equals(session.getStatus())) {
            throw new BadRequestException("This attendance session is no longer active");
        }

        // Determine status (present vs late)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lateThreshold = session.getStartTime().plusMinutes(session.getLateMinutes());
        String status;

        if (now.isAfter(session.getEndTime())) {
            if (!session.getAllowLate()) {
                throw new BadRequestException("Attendance window has closed");
            }
            status = "late";
        } else if (now.isAfter(lateThreshold)) {
            status = "late";
        } else {
            status = "present";
        }

        AttendanceRecord record = AttendanceRecord.builder()
                .session(session)
                .student(student)
                .course(session.getCourse())
                .status(status)
                .ipAddress(request.getRemoteAddr())
                .deviceInfo(request.getHeader("User-Agent"))
                .build();

        record = attendanceRecordRepository.save(record);
        auditService.log(student, "submit_attendance", "attendance_record", record.getId(), request);

        String message = "present".equals(status)
                ? "Attendance recorded! You are marked as Present."
                : "Attendance recorded as Late.";
        return ResponseEntity.ok(ApiResponse.success(message, record));
    }

    // ── Materials ──────────────────────────────────────────────────────
    @GetMapping("/materials")
    public ResponseEntity<ApiResponse<List<CourseMaterial>>> getMaterials(
            @RequestParam Long courseId, @AuthenticationPrincipal User student) {
        enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled"));
        return ResponseEntity.ok(ApiResponse.success(
                courseMaterialRepository.findByCourseIdOrderByIsPinnedDescCreatedAtDesc(courseId)));
    }

    // ── Messages ───────────────────────────────────────────────────────
    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<List<Message>>> getMessages(@AuthenticationPrincipal User student) {
        return ResponseEntity.ok(ApiResponse.success(
                messageRepository.findByReceiverIdOrderByCreatedAtDesc(student.getId())));
    }

    @PostMapping("/messages/send")
    public ResponseEntity<ApiResponse<Message>> sendMessage(
            @RequestBody Map<String, Object> body, @AuthenticationPrincipal User student) {
        Long receiverId = Long.valueOf(body.get("receiverId").toString());
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found"));

        Message msg = Message.builder()
                .sender(student).receiver(receiver)
                .subject(body.containsKey("subject") ? body.get("subject").toString() : null)
                .content(body.get("content").toString())
                .build();
        return ResponseEntity.ok(ApiResponse.success("Message sent", messageRepository.save(msg)));
    }

    @GetMapping("/messages/group/{courseId}")
    public ResponseEntity<ApiResponse<List<CourseMessage>>> getGroupMessages(
            @PathVariable Long courseId, @AuthenticationPrincipal User student) {
        enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Not enrolled"));
        return ResponseEntity.ok(ApiResponse.success(
                courseMessageRepository.findByCourseIdOrderByCreatedAtAsc(courseId)));
    }
}
