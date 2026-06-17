package com.eqms.notifications;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Async email sender for eQMS event notifications.
 *
 * <p>{@link JavaMailSender} is injected as optional — if SMTP is not configured
 * ({@code spring.mail.host} absent), the bean will not exist and all send calls become no-ops.
 * The app starts normally without email config in local/test environments.</p>
 *
 * <p>All sends are {@code @Async}, so they never block the caller or affect any
 * regulated transaction.</p>
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${eqms.mail.from:noreply@eqms.local}")
    private String fromAddress;

    @Value("${eqms.mail.from-name:eQMS Quality System}")
    private String fromName;

    @Value("${eqms.mail.base-url:http://localhost:3000}")
    private String baseUrl;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Async
    public void sendNotificationEmail(String toAddress, String toName,
                                      String subject, String title, String body,
                                      String recordType, String recordId) {
        if (!isMailConfigured() || toAddress == null || toAddress.isBlank()) {
            return;
        }
        String recordUrl = (recordType != null && recordId != null)
                ? buildRecordUrl(recordType, recordId) : null;
        String html = EmailTemplateBuilder.build(toName, title, body, recordUrl);
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toAddress);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.debug("Email sent to {} — {}", toAddress, subject);
        } catch (Exception ex) {
            log.warn("Failed to send email to {} ({}): {}", toAddress, subject, ex.getMessage());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toAddress, String toName, String token, Duration validFor) {
        if (!isMailConfigured() || toAddress == null || toAddress.isBlank()) {
            log.info("Password reset requested for {}. Reset link: {}", toAddress, passwordResetUrl(token));
            return;
        }
        String title = "Reset your eQMS password";
        String body = """
                We received a request to reset your eQMS password.
                Use the button below to set a new password. This link expires in %d minutes.
                If you did not request this change, you can ignore this email.
                """.formatted(validFor.toMinutes());
        String html = EmailTemplateBuilder.build(toName, title, body, passwordResetUrl(token));
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toAddress);
            helper.setSubject("[eQMS] Reset your password");
            helper.setText(html, true);
            mailSender.send(msg);
            log.debug("Password reset email sent to {}", toAddress);
        } catch (Exception ex) {
            log.warn("Failed to send password reset email to {}: {}", toAddress, ex.getMessage());
        }
    }

    private String passwordResetUrl(String token) {
        return baseUrl + "/reset-password?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private boolean isMailConfigured() {
        return mailSender != null && mailUsername != null && !mailUsername.isBlank();
    }

    private String buildRecordUrl(String recordType, String recordId) {
        return switch (recordType) {
            case "Document"           -> baseUrl + "/documents/"          + recordId;
            case "ChangeControl"      -> baseUrl + "/change-control/"     + recordId;
            case "Capa"               -> baseUrl + "/capa/"               + recordId;
            case "Deviation"          -> baseUrl + "/deviations/"         + recordId;
            case "Complaint"          -> baseUrl + "/complaints/"         + recordId;
            case "Audit"              -> baseUrl + "/audits/"             + recordId;
            case "Risk"               -> baseUrl + "/risks/"              + recordId;
            case "Supplier"           -> baseUrl + "/suppliers/"          + recordId;
            case "TrainingProgram"    -> baseUrl + "/training/"           + recordId;
            case "TrainingAssignment" -> baseUrl + "/my-trainings";
            case "Equipment"          -> baseUrl + "/equipment/"          + recordId;
            case "OosCase"            -> baseUrl + "/oos/"                + recordId;
            case "NonConformance"     -> baseUrl + "/non-conformances/"   + recordId;
            case "ManagementReview"   -> baseUrl + "/management-reviews/" + recordId;
            default                   -> baseUrl;
        };
    }
}
