package com.attendease.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendVerificationCode(String toEmail, String code) {
        String subject = "Verify Your AttendEase Account";
        String content = buildEmailHtml(
            "Welcome to AttendEase!",
            "Thank you for joining our platform. Please use the verification code below to complete your registration and activate your account.",
            code,
            "This code will expire in 5 minutes for your security."
        );

        sendEmail(toEmail, subject, content);
    }

    @Async
    public void sendPasswordChangeCode(String toEmail, String code) {
        String subject = "Security Verification Code";
        String content = buildEmailHtml(
            "Security Verification",
            "A sensitive change was requested for your profile. To ensure it's really you, please use the following code to authorize the update.",
            code,
            "If you did not request this, please secure your account immediately."
        );

        sendEmail(toEmail, subject, content);
    }

    private String buildEmailHtml(String title, String subtitle, String code, String footerNote) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
            + "<style>"
            + "  .container { max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; }"
            + "  .card { background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 20px; border: 1px solid #e5e7eb; }"
            + "  .header { background: linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; }"
            + "  .header h1 { color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-transform: uppercase; }"
            + "  .header p { color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 14px; }"
            + "  .body { padding: 40px 30px; text-align: center; }"
            + "  .body h2 { color: #111827; font-size: 22px; margin-bottom: 16px; font-weight: 700; }"
            + "  .body p { color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }"
            + "  .code-wrap { background-color: #f3f4f6; border-radius: 16px; padding: 24px; display: inline-block; min-width: 200px; border: 1px solid #e5e7eb; }"
            + "  .code { font-size: 48px; font-weight: 900; color: #1d4ed8; letter-spacing: 6px; margin: 0; font-family: monospace; }"
            + "  .footer { text-align: center; padding: 30px; color: #9ca3af; font-size: 12px; line-height: 1.5; }"
            + "</style></head><body>"
            + "<div class='container'>"
            + "  <div class='card'>"
            + "    <div class='header'>"
            + "      <h1>AttendEase</h1>"
            + "      <p>Intelligent Attendance Management</p>"
            + "    </div>"
            + "    <div class='body'>"
            + "      <h2>" + title + "</h2>"
            + "      <p>" + subtitle + "</p>"
            + "      <div class='code-wrap'>"
            + "        <div class='code'>" + code + "</div>"
            + "      </div>"
            + "      <p style='font-size: 14px; color: #6b7280; margin-top: 32px;'>" + footerNote + "</p>"
            + "    </div>"
            + "  </div>"
            + "  <div class='footer'>"
            + "    <p>&copy; 2026 AttendEase Secure Systems. All rights reserved.</p>"
            + "    <p>You received this email because you are a registered user of AttendEase.<br>If you have any questions, please contact our support team.</p>"
            + "  </div>"
            + "</div>"
            + "</body></html>";
    }

    private void sendEmail(String to, String subject, String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }
}