package com.eqms.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.eqms.auth.dto.LoginRequest;
import com.eqms.auth.dto.MfaVerifyRequest;
import com.eqms.auth.mfa.TotpService;
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end auth tests against the compose database: the mandatory two-step login (password +
 * TOTP), TOTP enrollment, account lockout after 5 failed attempts, and backend-enforced
 * authorization (permission-denied). Each test provisions its own user with a unique email.
 */
@AutoConfigureMockMvc
class AuthIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired
    MockMvc mockMvc;
    @Autowired
    UserRepository userRepository;
    @Autowired
    RoleRepository roleRepository;
    @Autowired
    UserRoleRepository userRoleRepository;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    TotpService totpService;
    @Autowired
    Clock clock;
    @Autowired
    ObjectMapper objectMapper;

    @Test
    void enrollmentFlowEstablishesSessionAndMeReturnsUser() throws Exception {
        User user = createUser(PASSWORD, false, null, "AUTHOR");

        // 1) password leg -> enrollment required, pre-auth session
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(user.getEmail(), PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ENROLLMENT_REQUIRED"))
                .andReturn();
        MockHttpSession session = sessionFrom(login);

        // 2) enroll -> get the secret
        MvcResult enroll = mockMvc.perform(post("/api/auth/mfa/enroll").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.secret").isNotEmpty())
                .andReturn();
        String secret = objectMapper.readTree(enroll.getResponse().getContentAsString()).get("secret").asText();

        // 3) verify the current code -> full session
        mockMvc.perform(post("/api/auth/mfa/verify").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MfaVerifyRequest(currentCode(secret)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AUTHENTICATED"));

        // 4) /me reflects the authenticated user
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.getEmail()));
    }

    @Test
    void enrolledUserWithAdminRoleCanReachAdminEndpoint() throws Exception {
        String secret = totpService.generateSecret();
        User user = createUser(PASSWORD, true, secret, "ADMIN");

        MockHttpSession session = authenticate(user.getEmail(), PASSWORD, secret);

        mockMvc.perform(get("/api/admin/ping").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void accountLocksAfterFiveFailedPasswordAttempts() throws Exception {
        User user = createUser(PASSWORD, false, null, "AUTHOR");

        // attempts 1-4: invalid credentials
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(new LoginRequest(user.getEmail(), "wrong-password"))))
                    .andExpect(status().isUnauthorized());
        }
        // attempt 5: threshold reached -> locked
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(user.getEmail(), "wrong-password"))))
                .andExpect(status().isLocked());
        // even the correct password is now rejected while locked
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(user.getEmail(), PASSWORD))))
                .andExpect(status().isLocked());
    }

    @Test
    void nonAdminUserIsDeniedAdminEndpoint() throws Exception {
        String secret = totpService.generateSecret();
        User user = createUser(PASSWORD, true, secret, "AUTHOR");

        MockHttpSession session = authenticate(user.getEmail(), PASSWORD, secret);

        // Authenticated, but lacks ROLE_ADMIN -> backend @PreAuthorize denies (403).
        mockMvc.perform(get("/api/admin/ping").session(session))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestToProtectedEndpointIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/ping"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidMfaCodeDoesNotEstablishFullSession() throws Exception {
        String secret = totpService.generateSecret();
        User user = createUser(PASSWORD, true, secret, "ADMIN");

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(user.getEmail(), PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MFA_REQUIRED"))
                .andReturn();
        MockHttpSession session = sessionFrom(login);

        mockMvc.perform(post("/api/auth/mfa/verify").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MfaVerifyRequest("000000"))))
                .andExpect(status().isUnauthorized());

        // Still only pre-auth: cannot reach the admin endpoint.
        mockMvc.perform(get("/api/admin/ping").session(session))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private MockHttpSession authenticate(String email, String password, String secret) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = sessionFrom(login);
        mockMvc.perform(post("/api/auth/mfa/verify").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MfaVerifyRequest(currentCode(secret)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AUTHENTICATED"));
        return session;
    }

    private String currentCode(String secret) {
        return totpService.generateCode(secret, totpService.currentTimeStep());
    }

    private MockHttpSession sessionFrom(MvcResult result) {
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private User createUser(String rawPassword, boolean mfaEnabled, String secret, String roleName) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("u-" + suffix + "@test.io");
        user.setUsername("u-" + suffix);
        user.setFullName("Test User " + suffix);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setMfaEnabled(mfaEnabled);
        user.setMfaSecret(secret);
        user.setStatus(User.UserStatus.ACTIVE);
        user = userRepository.save(user);

        if (roleName != null) {
            Role role = roleRepository.findByName(roleName).orElseThrow();
            UserRole assignment = new UserRole();
            assignment.setUser(user);
            assignment.setRole(role);
            assignment.setGrantedAt(Instant.now(clock));
            userRoleRepository.save(assignment);
        }
        return user;
    }
}
