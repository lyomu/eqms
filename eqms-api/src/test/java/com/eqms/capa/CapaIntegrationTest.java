package com.eqms.capa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.eqms.capa.dto.ApproveCapaRequest;
import com.eqms.capa.dto.CapaTransitionRequest;
import com.eqms.capa.dto.CloseCapaRequest;
import com.eqms.capa.dto.CreateCapaActionRequest;
import com.eqms.capa.dto.CreateCapaRequest;
import com.eqms.capa.dto.UpdateRootCauseRequest;
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
 * End-to-end CAPA: numbering, the full Draft -> Closed lifecycle including a root-cause edit, an
 * action item, and TWO signatures (approve + close), self-approval rejection, the version check,
 * and backend permission enforcement.
 */
@AutoConfigureMockMvc
class CapaIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsCapaNumberAndStartsInDraft() throws Exception {
        Ctx author = newUser("ADMIN");
        mockMvc.perform(post("/api/capas").session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaRequest("Mix-up investigation", CapaSource.DEVIATION,
                                "Wrong label applied", true, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.source").value("DEVIATION"))
                .andExpect(jsonPath("$.capaNumber").value(matchesPattern("CAPA-\\d{4}-\\d{3}")));
    }

    @Test
    void fullLifecycleToClosedWithTwoSignaturesAndAnActionItem() throws Exception {
        Ctx author = newUser("ADMIN");
        Ctx approver = newUser("ADMIN");

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        v = transition(author, id, "submit-for-investigation", v, "UNDER_INVESTIGATION");
        v = putRootCause(author, id, v, "Operator used an outdated label roll");
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");
        v = approve(approver, id, v);                              // 1st signature (with TOTP)
        v = transition(approver, id, "start-actions", v, "IN_PROGRESS");

        long actionId = addAction(approver, id);
        completeAction(approver, actionId);

        v = transition(approver, id, "submit-for-effectiveness", v, "PENDING_EFFECTIVENESS_CHECK");
        v = close(approver, id, v);                                // 2nd signature (same session, no TOTP)

        // Final state + audit trail content.
        mockMvc.perform(get("/api/capas/" + id).session(approver.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.effectivenessCheckResult").value("Verified effective after 30 days"));

        MvcResult trail = mockMvc.perform(get("/api/capas/" + id + "/audit-trail").session(approver.session))
                .andExpect(status().isOk()).andReturn();
        String body = trail.getResponse().getContentAsString();
        assertThat(body).contains("CREATE").contains("STATUS_CHANGE").contains("SIGN").contains("UPDATE");
    }

    @Test
    void authorCannotApproveOwnCapa() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = transition(author, id, "submit-for-investigation", v, "UNDER_INVESTIGATION");
        v = putRootCause(author, id, v, "Root cause text");
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");

        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/capas/" + id + "/approve").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveCapaRequest(v, "self", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejectedWithConflict() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        mockMvc.perform(post("/api/capas/" + id + "/submit-for-investigation").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CapaTransitionRequest(99, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void creatingWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/capas").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaRequest("Nope", CapaSource.OTHER, "x", false, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/capas").session(ctx.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaRequest("Investigation", CapaSource.DEVIATION,
                                "Problem description", true, null))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private int transition(Ctx ctx, long id, String action, int version, String expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/capas/" + id + "/" + action).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CapaTransitionRequest(version, action))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andReturn();
        return version(result);
    }

    private int putRootCause(Ctx ctx, long id, int version, String rootCause) throws Exception {
        MvcResult result = mockMvc.perform(put("/api/capas/" + id + "/root-cause").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateRootCauseRequest(version, rootCause, "RCA documented"))))
                .andExpect(status().isOk())
                .andReturn();
        return version(result);
    }

    private int approve(Ctx ctx, long id, int version) throws Exception {
        String code = totpService.generateCode(ctx.secret, totpService.currentTimeStep());
        MvcResult result = mockMvc.perform(post("/api/capas/" + id + "/approve").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveCapaRequest(version, "Approved", PASSWORD, code, "I approve."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();
        return version(result);
    }

    private int close(Ctx ctx, long id, int version) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/capas/" + id + "/close").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CloseCapaRequest(version, "Closing", PASSWORD, null, "I confirm closure.",
                                "Verified effective after 30 days"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andReturn();
        return version(result);
    }

    private long addAction(Ctx ctx, long capaId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/capas/" + capaId + "/actions").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaActionRequest(CapaActionType.CORRECTIVE,
                                "Retrain operator and update label control", null, null))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void completeAction(Ctx ctx, long actionId) throws Exception {
        mockMvc.perform(post("/api/capas/actions/" + actionId + "/complete").session(ctx.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedDate").isNotEmpty());
    }

    private int version(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("version").asInt();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private Ctx newUser(String roleName) throws Exception {
        String secret = totpService.generateSecret();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("capa-" + suffix + "@test.io");
        user.setUsername("capa-" + suffix);
        user.setFullName("CAPA User " + suffix);
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
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LoginRequest(email, PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        String code = totpService.generateCode(secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/auth/mfa/verify").session(session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MfaVerifyRequest(code))))
                .andExpect(status().isOk());
        return session;
    }

    private record Ctx(MockHttpSession session, String secret) {
    }
}
