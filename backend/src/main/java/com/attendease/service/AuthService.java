package com.attendease.service;

import com.attendease.dto.*;
import com.attendease.entity.*;
import com.attendease.exception.BadRequestException;
import com.attendease.exception.UnauthorizedException;
import com.attendease.repository.LoginAttemptRepository;
import com.attendease.repository.RefreshTokenRepository;
import com.attendease.repository.SecurityEventRepository;
import com.attendease.repository.UserRepository;
import com.attendease.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final SecurityEventRepository securityEventRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final LoginSecurityService loginSecurityService;

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        // Check rate limiting
        long recentFailures = loginAttemptRepository.countByEmailAndSuccessAndAttemptedAtAfter(
                request.getEmail(), false, LocalDateTime.now().minusMinutes(LOCKOUT_MINUTES));

        if (recentFailures >= MAX_ATTEMPTS) {
            throw new UnauthorizedException("Account temporarily locked. Try again in " + LOCKOUT_MINUTES + " minutes.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    loginSecurityService.recordAttempt(request.getEmail(), httpRequest, false);
                    return new UnauthorizedException("Invalid email or password");
                });

        if (!"active".equals(user.getStatus())) {
            throw new UnauthorizedException("Account is not active");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginSecurityService.recordAttempt(request.getEmail(), httpRequest, false);
            throw new UnauthorizedException("Invalid email or password");
        }

        // Successful login
        loginSecurityService.recordAttempt(request.getEmail(), httpRequest, true);
        
        // SECURITY POLICY: Single Session for Admins
        String sessionId = UUID.randomUUID().toString();
        if ("admin".equals(user.getRole())) {
            refreshTokenRepository.revokeAllByUserId(user.getId());
            user.setCurrentSessionId(sessionId);
            // Check for New IP Alert
            checkNewAdminIP(user, httpRequest);
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Record successful login in Audit Log for all users
        auditService.log(user, "login", "user", user.getId(), httpRequest);

        // Check if MFA is enabled
        if (user.getMfaEnabled() != null && user.getMfaEnabled()) {
            // Return MFA required response with temporary token
            String mfaToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), "mfa_pending", sessionId);
            return AuthResponse.builder()
                    .mfaRequired(true)
                    .mfaToken(mfaToken)
                    .tokenType("Bearer")
                    .build();
        }

        return generateAuthResponse(user, httpRequest, sessionId);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        if (!("student".equals(request.getRole()) || "teacher".equals(request.getRole()))) {
            request.setRole("student");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole())
                .studentId(request.getStudentId())
                .department(request.getDepartment())
                .status("active")
                .mfaEnabled(false)
                .build();

        user = userRepository.save(java.util.Objects.requireNonNull(user));
        auditService.log(user, "register", "user", user.getId(), httpRequest);

        String sessionId = UUID.randomUUID().toString();
        user.setCurrentSessionId(sessionId);
        userRepository.save(user);

        return generateAuthResponse(user, httpRequest, sessionId);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenStr) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (refreshToken.getRevoked() || refreshToken.isExpired()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        User user = refreshToken.getUser();

        // Revoke old token
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        return generateAuthResponse(user, null, user.getCurrentSessionId());
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    private void checkNewAdminIP(User user, HttpServletRequest request) {
        String currentIp = request != null ? request.getRemoteAddr() : "unknown";
        if ("unknown".equals(currentIp)) return;

        // Check if this IP has ever been used successfully by this admin before
        boolean isKnownIp = loginAttemptRepository.findAll().stream()
                .filter(a -> a.getEmail().equalsIgnoreCase(user.getEmail()))
                .filter(a -> a.getSuccess())
                .anyMatch(a -> currentIp.equals(a.getIpAddress()));

        if (!isKnownIp) {
            SecurityEvent event = new SecurityEvent();
            event.setType(SecurityEventType.SUSPICIOUS_ACTIVITY);
            event.setSeverity(SecurityEventSeverity.MEDIUM);
            event.setDescription("New IP detected for Admin: " + user.getEmail() + " from " + currentIp);
            event.setIpAddress(currentIp);
            event.setUserEmail(user.getEmail());
            event.setAcknowledged(false);
            securityEventRepository.save(event);
        }
    }

    private AuthResponse generateAuthResponse(User user, HttpServletRequest httpRequest, String sessionId) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole(), sessionId);
        String refreshTokenStr = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(java.util.Objects.requireNonNull(refreshToken));

        if (httpRequest != null) {
            auditService.log(user, "login", "user", user.getId(), httpRequest);
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(UserDto.fromEntity(user))
                .mfaRequired(false)
                .build();
    }


}
