package com.eqms.auth;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eqms.auth.dto.LoginRequest;
import com.eqms.auth.dto.LoginResponse;
import com.eqms.auth.dto.MeResponse;
import com.eqms.auth.dto.MfaEnrollResponse;
import com.eqms.auth.dto.MfaVerifyRequest;
import com.eqms.auth.dto.PasswordResetConfirmRequest;
import com.eqms.auth.dto.PasswordResetRequest;
import com.eqms.auth.dto.PasswordResetResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;

/**
 * Authentication endpoints. Login is a mandatory two-step flow (MFA required for all users):
 * <ol>
 *   <li>{@code POST /api/auth/login} — email+password. On success a <em>pre-auth</em> session is
 *       created and the response says whether the user must enroll TOTP or just verify it.</li>
 *   <li>{@code POST /api/auth/mfa/verify} — TOTP code. On success the session is upgraded to the
 *       full set of role/permission authorities.</li>
 * </ol>
 * {@code POST /api/auth/mfa/enroll} returns the enrollment secret for users not yet enrolled.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final CustomUserDetailsService userDetailsService;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
                          CustomUserDetailsService userDetailsService,
                          SecurityContextRepository securityContextRepository) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.userDetailsService = userDetailsService;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken token) {
        return ResponseEntity.ok(Map.of(
                "headerName", token.getHeaderName(),
                "parameterName", token.getParameterName(),
                "token", token.getToken()));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest,
                                               HttpServletResponse httpResponse) {
        LoginOutcome outcome = authService.login(request.email(), request.password(),
                clientIp(httpRequest), userAgent(httpRequest));
        return switch (outcome.status()) {
            case INVALID_CREDENTIALS -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(LoginStatus.INVALID_CREDENTIALS.name()));
            case LOCKED -> ResponseEntity.status(HttpStatus.LOCKED)
                    .body(new LoginResponse(LoginStatus.LOCKED.name()));
            case MFA_REQUIRED, ENROLLMENT_REQUIRED -> {
                // Establish a limited pre-auth session until TOTP is verified.
                UserPrincipal principal = UserPrincipal.preAuth(
                        outcome.userId(), outcome.organizationId(), outcome.email(), outcome.fullName());
                persistAuthentication(principal, httpRequest, httpResponse);
                yield ResponseEntity.ok(new LoginResponse(outcome.status().name()));
            }
            default -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(LoginStatus.INVALID_CREDENTIALS.name()));
        };
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<PasswordResetResponse> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequest request,
            HttpServletRequest httpRequest) {
        String message = passwordResetService.requestReset(
                request.email(), clientIp(httpRequest), userAgent(httpRequest));
        return ResponseEntity.accepted().body(new PasswordResetResponse(message));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request,
            HttpServletRequest httpRequest) {
        passwordResetService.confirmReset(
                request.token(), request.newPassword(), clientIp(httpRequest), userAgent(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mfa/enroll")
    public ResponseEntity<MfaEnrollResponse> enrollMfa() {
        UserPrincipal principal = currentPrincipal();
        MfaEnrollment enrollment = authService.enroll(principal.getId());
        return ResponseEntity.ok(new MfaEnrollResponse(enrollment.secret(), enrollment.otpauthUri()));
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<LoginResponse> verifyMfa(@Valid @RequestBody MfaVerifyRequest request,
                                                   HttpServletRequest httpRequest,
                                                   HttpServletResponse httpResponse) {
        UserPrincipal preAuth = currentPrincipal();
        LoginOutcome outcome = authService.verifyMfa(preAuth.getId(), request.code(),
                clientIp(httpRequest), userAgent(httpRequest));
        if (outcome.status() != LoginStatus.AUTHENTICATED) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(LoginStatus.INVALID_CODE.name()));
        }
        // Upgrade the session: reload with full role/permission authorities.
        UserPrincipal full = (UserPrincipal) userDetailsService.loadUserByUsername(outcome.email());
        persistAuthentication(full, httpRequest, httpResponse);
        return ResponseEntity.ok(new LoginResponse(LoginStatus.AUTHENTICATED.name()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        UserPrincipal principal = currentPrincipal();
        List<String> authorities = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).sorted().toList();
        return ResponseEntity.ok(new MeResponse(
                principal.getId(), principal.getOrganizationId(), principal.getEmail(), principal.getFullName(), authorities));
    }

    private void persistAuthentication(UserPrincipal principal, HttpServletRequest request,
                                       HttpServletResponse response) {
        Authentication authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    private UserPrincipal currentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new AccessDeniedException("Not authenticated");
        }
        return principal;
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
