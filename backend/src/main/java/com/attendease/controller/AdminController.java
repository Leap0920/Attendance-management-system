package com.attendease.controller;

import com.attendease.dto.ApiResponse;
import com.attendease.dto.AuditLogDto;
import com.attendease.dto.UserDto;
import com.attendease.entity.AuditLog;
import com.attendease.entity.Course;
import com.attendease.entity.User;
import com.attendease.exception.BadRequestException;
import com.attendease.exception.ResourceNotFoundException;
import com.attendease.repository.CourseRepository;
import com.attendease.repository.UserRepository;
import com.attendease.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

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
}
