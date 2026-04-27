package com.attendease;

import com.attendease.entity.User;
import com.attendease.repository.LoginAttemptRepository;
import com.attendease.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class EmergencyUnlock implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LoginAttemptRepository loginAttemptRepository;

    public EmergencyUnlock(UserRepository userRepository, LoginAttemptRepository loginAttemptRepository) {
        this.userRepository = userRepository;
        this.loginAttemptRepository = loginAttemptRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        String email = "admin@lms.com";
        System.out.println("EMERGENCY: Unlocking account " + email);
        
        // 1. Clear failed attempts
        loginAttemptRepository.deleteByEmail(email);
        
        // 2. Reset session and status
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setStatus("active");
            user.setCurrentSessionId(null);
            userRepository.save(user);
            System.out.println("EMERGENCY: Account active and sessions cleared.");
        });
    }
}
