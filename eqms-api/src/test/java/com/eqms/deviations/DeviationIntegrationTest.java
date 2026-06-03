package com.eqms.deviations;

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
import com.eqms.deviations.dto.ApproveDeviationRequest;
import com.eqms.deviations.dto.CreateDeviationRequest;
import com.eqms.deviations.dto.DeviationTransitionRequest;
import com.eqms.deviations.dto.UpdateDeviationRootCauseRequest;
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
 * End-to-end Deviations: numbering, the Draft -> Closed flow with a root-cause edit and an approval
 * signature, self-approval rejection, the version check, and backend permission enforcement.
 */
@AutoConfigureMockMvc
class DeviationIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsDeviationNumberAndStartsInDraft() throws Exception {
        Ctx author = newUser("ADMIN");
        mockMvc.perform(post("/api/deviations").session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateDeviationRequest("Temperature excursion", DeviationSeverity.MAJOR,
                                "Cold room exceeded 8C", "Quarantined affected lots", null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.severity").value("MAJOR"))
                .andExpect(jsonPath("$.deviationNumber").value(matchesPattern("DEV-\\d{4}-\\d{3}")));
    }

    @Test
    void fullFlowToClosedWithRootCauseEditAndSignature() throws Exception {
        Ctx author = newUser("ADMIN");
        Ctx approver = newUser("ADMIN");

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        v = transition(author, id, "submit-for-investigation", v, "UNDER_INVESTIGATION");
        v = putRootCause(author, id, v, "Faulty thermostat sensor");
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");

        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        MvcResult approved = mockMvc.perform(post("/api/deviations/" + id + "/approve").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveDeviationRequest(v, "Disposition approved", PASSWORD, code, "I approve."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();
        v = version(approved);

        transition(approver, id, "close", v, "CLOSED");

        MvcResult trail = mockMvc.perform(get("/api/deviations/" + id + "/audit-trail").session(approver.session))
                .andExpect(status().isOk()).andReturn();
        String body = trail.getResponse().getContentAsString();
        assertThat(body).contains("CREATE").contains("STATUS_CHANGE").contains("SIGN").contains("UPDATE");
    }

    @Test
    void authorCannotApproveOwnDeviation() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = transition(author, id, "submit-for-investigation", v, "UNDER_INVESTIGATION");
        v = putRootCause(author, id, v, "Root cause");
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");

        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/deviations/" + id + "/approve").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveDeviationRequest(v, "self", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejectedWithConflict() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        mockMvc.perform(post("/api/deviations/" + id + "/submit-for-investigation").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DeviationTransitionRequest(99, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void creatingWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/deviations").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateDeviationRequest("Nope", DeviationSeverity.MINOR, "x", null, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/deviations").session(ctx.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateDeviationRequest("Process deviation", DeviationSeverity.MAJOR,
                                "Out of range result", "Contained", null))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private int transition(Ctx ctx, long id, String action, int version, String expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/deviations/" + id + "/" + action).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DeviationTransitionRequest(version, action))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andReturn();
        return version(result);
    }

    private int putRootCause(Ctx ctx, long id, int version, String rootCause) throws Exception {
        MvcResult result = mockMvc.perform(put("/api/deviations/" + id + "/root-cause").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateDeviationRootCauseRequest(version, rootCause, "RCA documented"))))
                .andExpect(status().isOk())
                .andReturn();
        return version(result);
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
        user.setEmail("dev-" + suffix + "@test.io");
        user.setUsername("dev-" + suffix);
        user.setFullName("Dev User " + suffix);
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
