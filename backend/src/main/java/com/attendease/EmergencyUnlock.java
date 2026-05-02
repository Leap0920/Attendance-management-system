package com.attendease;

import com.attendease.repository.LoginAttemptRepository;
import com.attendease.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class EmergencyUnlock implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public EmergencyUnlock(UserRepository userRepository, LoginAttemptRepository loginAttemptRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.out.println("EMERGENCY: Resetting passwords and unlocking accounts...");
        
        // 1. Clear all failed attempts to be safe
        loginAttemptRepository.deleteAll();
        
        // 2. Reset sessions, statuses, and passwords
        userRepository.findAll().forEach(user -> {
            user.setStatus("active");
            user.setCurrentSessionId(null);
            
            // Fix passwords based on role
            if ("admin".equals(user.getRole())) {
                user.setPassword(passwordEncoder.encode("admin123"));
            } else if ("teacher".equals(user.getRole())) {
                user.setPassword(passwordEncoder.encode("teacher123"));
            } else if ("student".equals(user.getRole())) {
                user.setPassword(passwordEncoder.encode("student123"));
            }
            
            userRepository.save(user);
        });
        
        System.out.println("EMERGENCY: Accounts unlocked and passwords reset to defaults (admin123, teacher123, student123).");
    }
}
