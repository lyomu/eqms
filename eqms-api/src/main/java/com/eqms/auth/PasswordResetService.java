package com.eqms.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.notifications.EmailService;
import com.eqms.shared.constants.AuditAction;

@Service
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String GENERIC_MESSAGE =
            "If an account exists for that email, password reset instructions will be sent shortly.";

    private final UserRepository userRepository;
    private final PasswordResetRequestLogRepository requestLogRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final Clock clock;

    @Value("${eqms.auth.password-reset.token-minutes:30}")
    private long tokenMinutes;

    @Value("${eqms.auth.password-reset.rate-window-minutes:15}")
    private long rateWindowMinutes;

    @Value("${eqms.auth.password-reset.max-requests-per-email:3}")
    private long maxRequestsPerEmail;

    @Value("${eqms.auth.password-reset.max-requests-per-ip:10}")
    private long maxRequestsPerIp;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetRequestLogRepository requestLogRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder passwordEncoder,
                                EmailService emailService,
                                AuditService auditService,
                                Clock utcClock) {
        this.userRepository = userRepository;
        this.requestLogRepository = requestLogRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    @Transactional
    public String requestReset(String email, String ip, String userAgent) {
        Instant now = Instant.now(clock);
        String normalizedEmail = normalizeEmail(email);
        String normalizedIp = normalizeIp(ip);

        logRequest(normalizedEmail, normalizedIp, userAgent, now);
        enforceRateLimit(normalizedEmail, normalizedIp, now);

        userRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(user -> user.getStatus() != User.UserStatus.DISABLED)
                .ifPresent(user -> createAndEmailResetToken(user, normalizedEmail, normalizedIp, userAgent, now));

        return GENERIC_MESSAGE;
    }

    @Transactional
    public void confirmReset(String token, String newPassword, String ip, String userAgent) {
        Instant now = Instant.now(clock);
        PasswordResetToken resetToken = tokenRepository.findByTokenHash(hashToken(token))
                .orElseThrow(() -> invalidToken());
        if (resetToken.getUsedAt() != null || !resetToken.getExpiresAt().isAfter(now)) {
            throw invalidToken();
        }

        User user = resetToken.getUser();
        if (user.getStatus() == User.UserStatus.DISABLED) {
            throw invalidToken();
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        if (user.getStatus() == User.UserStatus.LOCKED) {
            user.setStatus(User.UserStatus.ACTIVE);
        }
        userRepository.save(user);

        resetToken.setUsedAt(now);
        tokenRepository.save(resetToken);
        tokenRepository.markUnusedTokensUsed(user.getId(), now);

        auditService.record(AuditEntryRequest.builder()
                .recordType("User").recordId(String.valueOf(user.getId()))
                .action(AuditAction.UPDATE)
                .userId(user.getId()).userFullName(user.getFullName())
                .reasonForChange("Password reset completed via emailed token")
                .ipAddress(ip).userAgent(userAgent)
                .build());
    }

    private void createAndEmailResetToken(User user, String email, String ip, String userAgent, Instant now) {
        tokenRepository.markUnusedTokensUsed(user.getId(), now);

        String rawToken = generateToken();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(hashToken(rawToken));
        resetToken.setRequestedEmail(email);
        resetToken.setRequestIp(ip);
        resetToken.setUserAgent(trim(userAgent, 500));
        resetToken.setCreatedAt(now);
        resetToken.setExpiresAt(now.plus(Duration.ofMinutes(tokenMinutes)));
        tokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(
                user.getEmail(), user.getFullName(), rawToken, Duration.ofMinutes(tokenMinutes));
    }

    private void logRequest(String email, String ip, String userAgent, Instant now) {
        PasswordResetRequestLog requestLog = new PasswordResetRequestLog();
        requestLog.setRequestedEmail(email);
        requestLog.setRequestIp(ip);
        requestLog.setUserAgent(trim(userAgent, 500));
        requestLog.setRequestedAt(now);
        requestLogRepository.save(requestLog);
    }

    private void enforceRateLimit(String email, String ip, Instant now) {
        Instant since = now.minus(Duration.ofMinutes(rateWindowMinutes));
        long emailRequests = requestLogRepository.countByRequestedEmailAndRequestedAtAfter(email, since);
        long ipRequests = requestLogRepository.countByRequestIpAndRequestedAtAfter(ip, since);
        if (emailRequests > maxRequestsPerEmail || ipRequests > maxRequestsPerIp) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many password reset requests. Please try again later.");
        }
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeIp(String ip) {
        return (ip == null || ip.isBlank()) ? "unknown" : ip.trim();
    }

    private static String trim(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private static ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "This password reset link is invalid or has expired.");
    }
}
