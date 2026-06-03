package com.eqms.changecontrol;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import com.eqms.changecontrol.dto.ApproveChangeRequest;
import com.eqms.changecontrol.dto.ChangeActionRequest;
import com.eqms.changecontrol.dto.CreateChangeControlRequest;
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Change Control: CC numbering, the Draft -> Approved flow with a Part 11 signature,
 * self-approval rejection, the optimistic-version check, and backend permission enforcement.
 */
@AutoConfigureMockMvc
class ChangeControlIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsChangeNumberAndStartsInDraft() throws Exception {
        Ctx author = newUser("ADMIN");

        mockMvc.perform(post("/api/change-controls").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateChangeControlRequest("Update mixer SOP", ChangeType.MAJOR,
                                "Replace mixer model", "Obsolete part", true, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.type").value("MAJOR"))
                .andExpect(jsonPath("$.changeNumber").value(matchesPattern("CC-\\d{4}-\\d{3}")));
    }

    @Test
    void fullApprovalFlowWithSignatureAndAuditTrail() throws Exception {
        Ctx author = newUser("ADMIN");
        Ctx approver = newUser("ADMIN");

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int version = created.get("version").asInt();

        version = action(author, id, "submit-for-review", version, "UNDER_REVIEW");
        version = action(author, id, "submit-for-approval", version, "PENDING_APPROVAL");

        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/change-controls/" + id + "/approve").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveChangeRequest(version, "Approved", PASSWORD, code, "I approve."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        MvcResult trail = mockMvc.perform(get("/api/change-controls/" + id + "/audit-trail").session(approver.session))
                .andExpect(status().isOk())
                .andReturn();
        String body = trail.getResponse().getContentAsString();
        assertThat(body).contains("CREATE").contains("STATUS_CHANGE").contains("SIGN");
    }

    @Test
    void authorCannotApproveOwnChange() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int version = created.get("version").asInt();
        version = action(author, id, "submit-for-review", version, "UNDER_REVIEW");
        version = action(author, id, "submit-for-approval", version, "PENDING_APPROVAL");

        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/change-controls/" + id + "/approve").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveChangeRequest(version, "self", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejectedWithConflict() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();

        mockMvc.perform(post("/api/change-controls/" + id + "/submit-for-review").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ChangeActionRequest(99, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void creatingWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");

        mockMvc.perform(post("/api/change-controls").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateChangeControlRequest("Nope", ChangeType.MINOR, "x", null, false, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/change-controls").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateChangeControlRequest("Process change", ChangeType.MAJOR,
                                "Description of the change", "Justification", true, null))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private int action(Ctx ctx, long id, String action, int expectedVersion, String expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/change-controls/" + id + "/" + action).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ChangeActionRequest(expectedVersion, action))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("version").asInt();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private Ctx newUser(String roleName) throws Exception {
        String secret = totpService.generateSecret();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("cc-" + suffix + "@test.io");
        user.setUsername("cc-" + suffix);
        user.setFullName("CC User " + suffix);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setMfaSecret(secret);
        user.setMfaEnabled(true);
        user.setStatus(User.UserStatus.ACTIVE);
        user = userRepository.save(user);

        Role role = roleRepository.findByName(roleName).orElseThrow();
        UserRole assignment = new UserRole();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setGrantedAt(Instant.now());
        userRoleRepository.save(assignment);

        return new Ctx(authenticate(user.getEmail(), secret), secret);
    }

    private MockHttpSession authenticate(String email, String secret) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        String code = totpService.generateCode(secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/auth/mfa/verify").session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MfaVerifyRequest(code))))
                .andExpect(status().isOk());
        return session;
    }

    private record Ctx(MockHttpSession session, String secret) {
    }
}
