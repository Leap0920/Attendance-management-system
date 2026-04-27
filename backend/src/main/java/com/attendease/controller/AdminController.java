package com.attendease.controller;

import com.attendease.dto.*;
import com.attendease.entity.*;
import com.attendease.exception.BadRequestException;
import com.attendease.exception.ResourceNotFoundException;
import com.attendease.repository.CourseRepository;
import com.attendease.repository.IPAccessListRepository;
import com.attendease.repository.SecurityEventRepository;
import com.attendease.repository.UserRepository;
import com.attendease.service.AuditService;
import com.attendease.service.DashboardAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AdminController {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final DashboardAnalyticsService analyticsService;
    private final SecurityEventRepository securityEventRepository;
    private final IPAccessListRepository ipAccessListRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalStudents", userRepository.countByRole("student"));
        stats.put("totalTeachers", userRepository.countByRole("teacher"));
        stats.put("totalCourses", courseRepository.count());
        stats.put("activeCourses", courseRepository.countByStatus("active"));
        stats.put("archivedCourses", courseRepository.countByStatus("archived"));
        stats.put("deletedCourses", courseRepository.countByStatus("deleted"));
        stats.put("activeUsers", userRepository.countByStatus("active"));
        stats.put("recentUsers", userRepository.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent().stream().map(UserDto::fromEntity).toList());
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDto>> getDashboardStats() {
        DashboardStatsDto stats = analyticsService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/analytics/users")
    public ResponseEntity<ApiResponse<List<AnalyticsDataDto>>> getUserAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        if (startDate == null) {
            startDate = LocalDateTime.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        List<AnalyticsDataDto> data = analyticsService.getUserGrowthData(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/analytics/logins")
    public ResponseEntity<ApiResponse<List<AnalyticsDataDto>>> getLoginAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        if (startDate == null) {
            startDate = LocalDateTime.now().minusDays(7);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        List<AnalyticsDataDto> data = analyticsService.getLoginActivityData(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/analytics/users-by-role")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUsersByRole() {
        Map<String, Long> data = analyticsService.getUsersByRole();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/analytics/courses-by-status")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getCoursesByStatus() {
        Map<String, Long> data = analyticsService.getCoursesByStatus();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/system/health")
    public ResponseEntity<ApiResponse<SystemHealthDto>> getSystemHealth() {
        SystemHealthDto health = analyticsService.getSystemHealth();
        return ResponseEntity.ok(ApiResponse.success(health));
    }

    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<Course>>> getAllCourses(
            @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.success(courseRepository.findByStatus(status)));
        }
        return ResponseEntity.ok(ApiResponse.success(courseRepository.findAll()));
    }

    @PostMapping("/courses/{id}/archive")
    public ResponseEntity<ApiResponse<Course>> archiveCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if ("deleted".equals(course.getStatus())) {
            throw new BadRequestException("Cannot archive a deleted course");
        }

        course.setStatus("archived");
        course = courseRepository.save(course);
        auditService.log(admin, "archive_course", "course", id, request);

        return ResponseEntity.ok(ApiResponse.success("Course archived", course));
    }

    @PostMapping("/courses/{id}/activate")
    public ResponseEntity<ApiResponse<Course>> activateCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        course.setStatus("active");
        course = courseRepository.save(course);
        auditService.log(admin, "unarchive_course", "course", id, request);

        return ResponseEntity.ok(ApiResponse.success("Course activated", course));
    }

    @PostMapping("/courses/{id}/delete")
    public ResponseEntity<ApiResponse<Course>> deleteCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        course.setStatus("deleted");
        course = courseRepository.save(course);
        auditService.log(admin, "delete_course", "course", id, request);

        return ResponseEntity.ok(ApiResponse.success("Course deleted", course));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        List<User> users;
        if (role != null && status != null) {
            users = userRepository.findByRoleAndStatus(role, status);
        } else if (role != null) {
            users = userRepository.findByRole(role);
        } else if (status != null) {
            users = userRepository.findByStatus(status);
        } else {
            users = userRepository.findAll();
        }
        return ResponseEntity.ok(ApiResponse.success(users.stream().map(UserDto::fromEntity).toList()));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserDto>> createUser(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {

        String email = body.get("email");
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already exists");
        }

        User user = User.builder()
                .firstName(body.get("firstName"))
                .lastName(body.get("lastName"))
                .email(email)
                .password(passwordEncoder.encode(body.getOrDefault("password", "password123")))
                .role(body.getOrDefault("role", "student"))
                .department(body.get("department"))
                .status("active")
                .mfaEnabled(false)
                .build();

        user = userRepository.save(user);
        auditService.log(admin, "create_user", "user", user.getId(), request);

        return ResponseEntity.ok(ApiResponse.success("User created", UserDto.fromEntity(user)));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (body.containsKey("firstName")) user.setFirstName(body.get("firstName"));
        if (body.containsKey("lastName")) user.setLastName(body.get("lastName"));
        if (body.containsKey("email")) {
            if (userRepository.findByEmail(body.get("email")).filter(u -> !u.getId().equals(id)).isPresent()) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(body.get("email"));
        }
        if (body.containsKey("role")) user.setRole(body.get("role"));
        if (body.containsKey("status")) user.setStatus(body.get("status"));
        if (body.containsKey("department")) user.setDepartment(body.get("department"));
        if (body.containsKey("password") && !body.get("password").isEmpty()) {
            user.setPassword(passwordEncoder.encode(body.get("password")));
        }

        user = userRepository.save(user);
        auditService.log(admin, "update_user", "user", user.getId(), request);

        return ResponseEntity.ok(ApiResponse.success("User updated", UserDto.fromEntity(user)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {

        if (admin.getId().equals(id)) {
            throw new BadRequestException("Cannot delete your own account");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        userRepository.delete(user);
        auditService.log(admin, "delete_user", "user", id, request);

        return ResponseEntity.ok(ApiResponse.success("User deleted", null));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLogDto>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<AuditLog> logs = auditService.searchAll(search, PageRequest.of(page, size));
        Page<AuditLogDto> dtos = logs.map(AuditLogDto::fromEntity);
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    /* ── Security Events ───────────────────────────────────── */

    @GetMapping("/security/events")
    public ResponseEntity<ApiResponse<Page<SecurityEventDto>>> getSecurityEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        if (startDate == null) startDate = LocalDateTime.now().minusDays(30);
        if (endDate == null) endDate = LocalDateTime.now();

        SecurityEventType typeEnum = null;
        SecurityEventSeverity severityEnum = null;
        try { if (type != null) typeEnum = SecurityEventType.valueOf(type); } catch (Exception ignored) {}
        try { if (severity != null) severityEnum = SecurityEventSeverity.valueOf(severity); } catch (Exception ignored) {}

        Page<SecurityEvent> events = securityEventRepository.findByFilters(
                typeEnum, severityEnum, startDate, endDate,
                PageRequest.of(page, size));

        Page<SecurityEventDto> dtos = events.map(e -> {
            SecurityEventDto dto = new SecurityEventDto();
            dto.setId(e.getId());
            dto.setType(e.getType().name());
            dto.setSeverity(e.getSeverity().name());
            dto.setDescription(e.getDescription());
            dto.setIpAddress(e.getIpAddress());
            dto.setUserEmail(e.getUserEmail());
            dto.setCountryCode(e.getCountryCode());
            dto.setCity(e.getCity());
            dto.setMetadata(e.getMetadata());
            dto.setCreatedAt(e.getCreatedAt());
            dto.setAcknowledged(e.getAcknowledged());
            dto.setAcknowledgedBy(e.getAcknowledgedBy());
            dto.setAcknowledgedAt(e.getAcknowledgedAt());
            return dto;
        });
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PostMapping("/security/events/{id}/acknowledge")
    public ResponseEntity<ApiResponse<Void>> acknowledgeSecurityEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin) {
        SecurityEvent event = securityEventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Security event not found"));
        event.setAcknowledged(true);
        event.setAcknowledgedBy(admin.getId());
        event.setAcknowledgedAt(LocalDateTime.now());
        securityEventRepository.save(event);
        return ResponseEntity.ok(ApiResponse.success("Event acknowledged", null));
    }

    @GetMapping("/security/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSecuritySummary() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusHours(24);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalEvents24h", securityEventRepository.countByCreatedAtAfter(yesterday));
        summary.put("criticalEvents24h", securityEventRepository.countBySeverityAndCreatedAtAfter(
                SecurityEventSeverity.CRITICAL, yesterday));
        summary.put("highEvents24h", securityEventRepository.countBySeverityAndCreatedAtAfter(
                SecurityEventSeverity.HIGH, yesterday));
        summary.put("mediumEvents24h", securityEventRepository.countBySeverityAndCreatedAtAfter(
                SecurityEventSeverity.MEDIUM, yesterday));
        summary.put("lowEvents24h", securityEventRepository.countBySeverityAndCreatedAtAfter(
                SecurityEventSeverity.LOW, yesterday));
        summary.put("blockedIPs", ipAccessListRepository.findByType(IPAccessType.BLOCKLIST).size());
        summary.put("whitelistedIPs", ipAccessListRepository.findByType(IPAccessType.WHITELIST).size());

        // Geographic breakdown
        List<Object[]> geoData = securityEventRepository.getCountryBreakdown(yesterday);
        Map<String, Long> countryStats = new HashMap<>();
        for (Object[] row : geoData) {
            String country = (String) row[0];
            Long count = (Long) row[1];
            if (country != null) countryStats.put(country, count);
        }
        summary.put("topCountries", countryStats);

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    /* ── IP Access Control ─────────────────────────────────── */

    @GetMapping("/security/ip-access")
    public ResponseEntity<ApiResponse<List<IPAccessListDto>>> getIPAccessList() {
        List<IPAccessList> entries = ipAccessListRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<IPAccessListDto> dtos = entries.stream().map(e -> {
            IPAccessListDto dto = new IPAccessListDto();
            dto.setId(e.getId());
            dto.setIpAddress(e.getIpAddress());
            dto.setType(e.getType().name());
            dto.setReason(e.getReason());
            dto.setAddedBy(e.getAddedBy() != null ? e.getAddedBy().getId() : null);
            dto.setAddedByName(e.getAddedBy() != null
                    ? e.getAddedBy().getFirstName() + " " + e.getAddedBy().getLastName() : null);
            dto.setCreatedAt(e.getCreatedAt());
            dto.setExpiresAt(e.getExpiresAt());
            return dto;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PostMapping("/security/ip-access")
    public ResponseEntity<ApiResponse<IPAccessListDto>> addIPAccessEntry(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {

        String ipAddress = body.get("ipAddress");
        String type = body.get("type"); // BLOCK or WHITELIST
        String reason = body.get("reason");

        if (ipAddress == null || type == null) {
            throw new BadRequestException("ipAddress and type are required");
        }

        // Remove existing entry for same IP if exists
        ipAccessListRepository.findByIpAddress(ipAddress).ifPresent(ipAccessListRepository::delete);

        IPAccessList entry = new IPAccessList();
        entry.setIpAddress(ipAddress);
        entry.setType(IPAccessType.valueOf(type));
        entry.setReason(reason);
        entry.setAddedBy(admin);

        String expiresAt = body.get("expiresAt");
        if (expiresAt != null && !expiresAt.isEmpty()) {
            entry.setExpiresAt(LocalDateTime.parse(expiresAt));
        }

        entry = ipAccessListRepository.save(entry);
        auditService.log(admin, "ip_" + type.toLowerCase(), "ip_access", entry.getId(), request);

        IPAccessListDto dto = new IPAccessListDto();
        dto.setId(entry.getId());
        dto.setIpAddress(entry.getIpAddress());
        dto.setType(entry.getType().name());
        dto.setReason(entry.getReason());
        dto.setCreatedAt(entry.getCreatedAt());
        return ResponseEntity.ok(ApiResponse.success("IP entry added", dto));
    }

    @DeleteMapping("/security/ip-access/{id}")
    public ResponseEntity<ApiResponse<Void>> removeIPAccessEntry(
            @PathVariable Long id,
            @AuthenticationPrincipal User admin,
            HttpServletRequest request) {
        IPAccessList entry = ipAccessListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("IP access entry not found"));
        ipAccessListRepository.delete(entry);
        auditService.log(admin, "remove_ip_rule", "ip_access", id, request);
        return ResponseEntity.ok(ApiResponse.success("IP entry removed", null));
    }
}
