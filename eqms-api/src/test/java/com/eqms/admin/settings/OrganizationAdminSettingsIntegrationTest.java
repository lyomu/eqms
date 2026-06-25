package com.eqms.admin.settings;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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

@AutoConfigureMockMvc
class OrganizationAdminSettingsIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired
    MockMvc mockMvc;
    @Autowired
    JdbcTemplate jdbc;
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
    void criticalQmsScopeUpdateRequiresReasonAndEffectiveDate() throws Exception {
        User admin = createAdmin();
        MockHttpSession session = authenticate(admin.getEmail(), admin.getMfaSecret());

        mockMvc.perform(put("/api/admin/settings/qms-scope").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "settings", Map.of(
                                        "scopeStatement", "Manufacture and release of oral solid dose medicines.",
                                        "scopeStatus", "Draft"
                                )
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Critical settings changes require a change reason."));
    }

    @Test
    void qmsScopeUpdateIsSavedAndAppearsInSettingsHistory() throws Exception {
        User admin = createAdmin();
        MockHttpSession session = authenticate(admin.getEmail(), admin.getMfaSecret());

        mockMvc.perform(put("/api/admin/settings/qms-scope").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "settings", Map.of(
                                        "scopeStatement", "Manufacture and release of oral solid dose medicines.",
                                        "scopeOwner", "QA Manager",
                                        "scopeStatus", "Draft"
                                ),
                                "changeReason", "Initial QMS scope definition",
                                "effectiveDate", "2026-07-01",
                                "changeImpact", "Creates a controlled reference for audits and management review"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scopeStatement").value("Manufacture and release of oral solid dose medicines."));

        mockMvc.perform(get("/api/admin/settings/audit-log").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].section").value("qms-scope"))
                .andExpect(jsonPath("$[0].reason").value("Initial QMS scope definition"))
                .andExpect(jsonPath("$[0].effectiveDate").value("2026-07-01"));
    }

    @Test
    void auditTrailCannotBeDisabledForRegulatedSettings() throws Exception {
        User admin = createAdmin();
        MockHttpSession session = authenticate(admin.getEmail(), admin.getMfaSecret());

        mockMvc.perform(put("/api/admin/settings/audit-trail").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "settings", Map.of("auditTrailEnabled", false),
                                "changeReason", "Attempt to disable audit trail",
                                "effectiveDate", "2026-07-01"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Audit trail cannot be disabled for regulated QMS modules."));
    }

    private User createAdmin() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long orgId = jdbc.queryForObject("""
                insert into organizations (code, name, status, version, created_at, updated_at)
                values (?, ?, 'active', 0, now(), now())
                returning id
                """, Long.class, "ORG-" + suffix, "Org " + suffix);
        jdbc.update("""
                insert into organization_licenses (organization_id, status, user_limit, starts_at, expires_at, version, created_at, updated_at)
                values (?, 'active', 25, now(), now() + interval '30 days', 0, now(), now())
                """, orgId);

        String secret = totpService.generateSecret();
        User user = new User();
        user.setOrganizationId(orgId);
        user.setEmail("settings-admin-" + suffix + "@test.io");
        user.setUsername("settings-admin-" + suffix);
        user.setFullName("Settings Admin " + suffix);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setMfaEnabled(true);
        user.setMfaSecret(secret);
        user.setStatus(User.UserStatus.ACTIVE);
        user = userRepository.save(user);

        Role role = roleRepository.findByName("ADMIN").orElseThrow();
        UserRole assignment = new UserRole();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setGrantedAt(Instant.now(clock));
        userRoleRepository.save(assignment);
        return user;
    }

    private MockHttpSession authenticate(String email, String secret) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        mockMvc.perform(post("/api/auth/mfa/verify").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MfaVerifyRequest(totpService.generateCode(secret, totpService.currentTimeStep())))))
                .andExpect(status().isOk());
        return session;
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
