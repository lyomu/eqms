package com.eqms.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.auth.mfa.TotpService;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.shared.constants.AuditAction;

/**
 * Credentials + MFA authentication logic (CLAUDE.md: backend-enforced, server-side UTC time,
 * audited). Auth failures are returned as {@link LoginStatus} values rather than thrown, so that
 * the failed-attempt counter and lockout state are committed instead of rolled back.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpService totpService;
    private final AuditService auditService;
    private final Clock clock;

    @Value("${eqms.auth.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${eqms.auth.lockout-minutes:15}")
    private long lockoutMinutes;

    @Value("${eqms.auth.totp-issuer:eQMS}")
    private String totpIssuer;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       TotpService totpService, AuditService auditService, Clock utcClock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.totpService = totpService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    /**
     * Validate email/password. On success returns MFA_REQUIRED or ENROLLMENT_REQUIRED; on failure
     * increments the lockout counter (and locks after the configured threshold) and returns the
     * appropriate status.
     */
    @Transactional
    public LoginOutcome login(String email, String rawPassword, String ip, String userAgent) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return LoginOutcome.invalidCredentials();
        }
        if (isLocked(user)) {
            return LoginOutcome.locked();
        }
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            boolean lockedNow = registerFailedAttempt(user, ip, userAgent);
            return lockedNow ? LoginOutcome.locked() : LoginOutcome.invalidCredentials();
        }

        // Password correct — clear any prior failure state.
        if (user.getFailedLoginAttempts() != 0 || user.getLockedUntil() != null
                || user.getStatus() == User.UserStatus.LOCKED) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            if (user.getStatus() == User.UserStatus.LOCKED) {
                user.setStatus(User.UserStatus.ACTIVE);
            }
        }
        user.setLastLoginAt(Instant.now(clock));
        userRepository.save(user);

        LoginStatus status = user.isMfaEnabled() ? LoginStatus.MFA_REQUIRED : LoginStatus.ENROLLMENT_REQUIRED;
        return new LoginOutcome(user.getId(), user.getEmail(), user.getFullName(), status);
    }

    /** Begin TOTP enrollment: generate + store a pending secret, return the otpauth URI. */
    @Transactional
    public MfaEnrollment enroll(Long userId) {
        User user = requireUser(userId);
        String secret = totpService.generateSecret();
        user.setMfaSecret(secret);
        userRepository.save(user);
        return new MfaEnrollment(secret, totpService.otpAuthUri(totpIssuer, user.getEmail(), secret));
    }

    /**
     * Verify a TOTP code. On first success it also marks MFA enrolled. Returns AUTHENTICATED on
     * success (audited as a LOGIN), INVALID_CODE otherwise.
     */
    @Transactional
    public LoginOutcome verifyMfa(Long userId, String code, String ip, String userAgent) {
        User user = requireUser(userId);
        if (user.getMfaSecret() == null || !totpService.verify(user.getMfaSecret(), code)) {
            return LoginOutcome.invalidCode();
        }
        boolean firstEnrollment = !user.isMfaEnabled();
        if (firstEnrollment) {
            user.setMfaEnabled(true);
            userRepository.save(user);
        }
        auditService.record(AuditEntryRequest.builder()
                .recordType("User").recordId(String.valueOf(user.getId()))
                .action(AuditAction.LOGIN)
                .userId(user.getId()).userFullName(user.getFullName())
                .reasonForChange(firstEnrollment
                        ? "MFA enrollment completed; login succeeded"
                        : "Login succeeded (password + MFA)")
                .ipAddress(ip).userAgent(userAgent)
                .build());
        return new LoginOutcome(user.getId(), user.getEmail(), user.getFullName(), LoginStatus.AUTHENTICATED);
    }

    private boolean isLocked(User user) {
        return user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now(clock));
    }

    /** Increment failures; lock the account (and audit it) once the threshold is reached. */
    private boolean registerFailedAttempt(User user, String ip, String userAgent) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        boolean lockedNow = false;
        if (attempts >= maxFailedAttempts) {
            user.setLockedUntil(Instant.now(clock).plus(Duration.ofMinutes(lockoutMinutes)));
            user.setStatus(User.UserStatus.LOCKED);
            lockedNow = true;
            auditService.record(AuditEntryRequest.builder()
                    .recordType("User").recordId(String.valueOf(user.getId()))
                    .action(AuditAction.LOGIN)
                    .userId(user.getId()).userFullName(user.getFullName())
                    .reasonForChange("Account locked after " + attempts + " failed login attempts")
                    .ipAddress(ip).userAgent(userAgent)
                    .build());
        }
        userRepository.save(user);
        return lockedNow;
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found: " + userId));
    }
}
