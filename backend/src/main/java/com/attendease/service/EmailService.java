package com.attendease.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendVerificationCode(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("carlobaclao789@gmail.com");
        message.setTo(to);
        message.setSubject("AttendEase - Verification Code");
        message.setText("Welcome to AttendEase!\n\n" +
                "Your verification code is: " + code + "\n\n" +
                "This code will expire in 5 minutes.\n\n" +
                "If you did not request this code, please ignore this email.");
        mailSender.send(message);
    }
}
