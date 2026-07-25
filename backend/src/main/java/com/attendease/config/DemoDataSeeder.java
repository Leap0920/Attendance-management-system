package com.attendease.config;

import com.attendease.entity.User;
import com.attendease.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DemoDataSeeder {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void seedDemoAccounts() {
        try {
            createOrUpdateUser("admin@lms.com", "admin123", "System", "Administrator", "admin", null, null);
            createOrUpdateUser("teacher@lms.com", "teacher123", "John", "Smith", "teacher", null, "Computer Science");
            createOrUpdateUser("student1@lms.com", "student123", "Alice", "Johnson", "student", "STU001", "Computer Science");
            createOrUpdateUser("student2@lms.com", "student123", "Bob", "Williams", "student", "STU002", "Computer Science");
            createOrUpdateUser("student3@lms.com", "student123", "Carol", "Davis", "student", "STU003", "Information Technology");
            System.out.println("[DEMO SEEDER] Demo accounts seeded and activated successfully.");
        } catch (Exception e) {
            System.err.println("[DEMO SEEDER ERROR] Failed to seed demo accounts: " + e.getMessage());
        }
    }

    private void createOrUpdateUser(String email, String rawPassword, String firstName, String lastName, String role, String studentId, String department) {
        Optional<User> existing = userRepository.findByEmail(email.toLowerCase().trim());
        if (existing.isPresent()) {
            User user = existing.get();
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setStatus("active");
            userRepository.save(user);
        } else {
            User newUser = User.builder()
                    .email(email.toLowerCase().trim())
                    .password(passwordEncoder.encode(rawPassword))
                    .firstName(firstName)
                    .lastName(lastName)
                    .role(role)
                    .studentId(studentId)
                    .department(department)
                    .status("active")
                    .mfaEnabled(false)
                    .build();
            userRepository.save(newUser);
        }
    }
}
