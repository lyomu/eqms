package com.eqms.oosmanagement;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
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
import com.eqms.oosmanagement.dto.CloseOosCaseRequest;
import com.eqms.oosmanagement.dto.CreateOosCaseRequest;
import com.eqms.oosmanagement.dto.DetermineDispositionRequest;
import com.eqms.oosmanagement.dto.InitialAssessmentRequest;
import com.eqms.oosmanagement.dto.OosTransitionRequest;
import com.eqms.oosmanagement.dto.RepeatResultRequest;
import com.eqms.oosmanagement.dto.RepeatTestingRequest;
import com.eqms.oosmanagement.dto.RootCauseAnalysisRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@AutoConfigureMockMvc
class OosIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsNumberAndStartsReported() throws Exception {
        Ctx actor = newUser("ADMIN");
        mockMvc.perform(post("/api/oos").session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateOosCaseRequest(1L, "USP <621>",
                                new BigDecimal("98.0"), new BigDecimal("102.0"),
                                "97.3%", "QC Analyst"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REPORTED"))
                .andExpect(jsonPath("$.oosNo").value(matchesPattern("OOS-\\d{4}-\\d{3}")));
    }

    @Test
    void repeatTestPassPath() throws Exception {
        Ctx reporter = newUser("ADMIN");
        Ctx closer = newUser("ADMIN");

        JsonNode created = create(reporter);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Initial assessment — likely testing error
        MvcResult assessed = mockMvc.perform(post("/api/oos/" + id + "/initial-assessment")
                        .session(reporter.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InitialAssessmentRequest(v,
                                "Potential pipette calibration error during analysis",
                                LikelyCause.TESTING_ERROR, "assess"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INITIAL_ASSESSMENT"))
                .andReturn();
        v = version(assessed);

        // Order repeat testing
        MvcResult repeated = mockMvc.perform(post("/api/oos/" + id + "/repeat-testing")
                        .session(reporter.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RepeatTestingRequest(v, "repeat ordered"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AWAITING_REPEAT"))
                .andReturn();
        v = version(repeated);

        // Repeat result PASS → auto-accept disposition
        MvcResult repeatPassed = mockMvc.perform(post("/api/oos/" + id + "/repeat-result")
                        .session(reporter.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RepeatResultRequest(v, RepeatTestResult.PASS,
                                "Lab Tech", "Result 100.2% within spec", "pass"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPOSITION_DETERMINED"))
                .andExpect(jsonPath("$.disposition.disposition").value("ACCEPT"))
                .andReturn();
        v = version(repeatPassed);

        // Close by a different user (self-approval blocked)
        String code = totpService.generateCode(closer.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/oos/" + id + "/close").session(closer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CloseOosCaseRequest(v, "Investigation complete",
                                PASSWORD, code, "close"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    void repeatTestFailPath() throws Exception {
        Ctx actor = newUser("ADMIN");
        Ctx approver = newUser("ADMIN");

        JsonNode created = create(actor);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Assess as product quality issue
        MvcResult assessed = mockMvc.perform(post("/api/oos/" + id + "/initial-assessment")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InitialAssessmentRequest(v,
                                "Sample correctly handled; result may indicate product quality issue",
                                LikelyCause.PRODUCT_QUALITY, "assess"))))
                .andExpect(status().isOk())
                .andReturn();
        v = version(assessed);

        // Order repeat testing
        MvcResult repeated = mockMvc.perform(post("/api/oos/" + id + "/repeat-testing")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RepeatTestingRequest(v, "ordered"))))
                .andExpect(status().isOk())
                .andReturn();
        v = version(repeated);

        // Repeat result FAIL → moves to INVESTIGATING
        MvcResult repeatFailed = mockMvc.perform(post("/api/oos/" + id + "/repeat-result")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RepeatResultRequest(v, RepeatTestResult.FAIL,
                                "Lab Tech", "Second result also OOS", "fail"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INVESTIGATING"))
                .andReturn();
        v = version(repeatFailed);

        // Submit RCA
        mockMvc.perform(post("/api/oos/" + id + "/root-cause-analysis")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RootCauseAnalysisRequest(
                                "Batch showed API content uniformity issues",
                                "API blending step insufficient", "5 Whys", "rca"))))
                .andExpect(status().isOk());

        // Determine disposition with signature (approver, not reporter)
        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        MvcResult disposed = mockMvc.perform(post("/api/oos/" + id + "/determine-disposition")
                        .session(approver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DetermineDispositionRequest(v, OosDispositionDecision.REJECT,
                                "Batch rejected; product quality compromised",
                                PASSWORD, code, "approve", "reject"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPOSITION_DETERMINED"))
                .andExpect(jsonPath("$.disposition.disposition").value("REJECT"))
                .andReturn();
        v = version(disposed);

        // Close
        String code2 = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/oos/" + id + "/close").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CloseOosCaseRequest(v, "OOS investigation complete",
                                PASSWORD, code2, "close"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    void reporterCannotCloseOwnCase() throws Exception {
        Ctx reporter = newUser("ADMIN");

        JsonNode created = create(reporter);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        v = version(mockMvc.perform(post("/api/oos/" + id + "/initial-assessment")
                        .session(reporter.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InitialAssessmentRequest(v, "findings",
                                LikelyCause.TESTING_ERROR, "assess"))))
                .andExpect(status().isOk()).andReturn());

        v = version(mockMvc.perform(post("/api/oos/" + id + "/repeat-testing")
                        .session(reporter.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RepeatTestingRequest(v, "ordered"))))
                .andExpect(status().isOk()).andReturn());

        v = version(mockMvc.perform(post("/api/oos/" + id + "/repeat-result")
                        .session(reporter.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RepeatResultRequest(v, RepeatTestResult.PASS,
                                null, null, "pass"))))
                .andExpect(status().isOk()).andReturn());

        // Reporter attempts self-close — blocked
        String code = totpService.generateCode(reporter.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/oos/" + id + "/close").session(reporter.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CloseOosCaseRequest(v, "self-close", PASSWORD, code, "close"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx op = newUser("OPERATOR");
        mockMvc.perform(post("/api/oos").session(op.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateOosCaseRequest(1L, "method", null, null, "97.1%", null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/oos").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateOosCaseRequest(1L, "USP <621>",
                                new BigDecimal("98.0"), new BigDecimal("102.0"),
                                "97.1%", "QC Analyst"))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
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
        user.setEmail("oos-" + suffix + "@test.io");
        user.setUsername("oos-" + suffix);
        user.setFullName("OOS User " + suffix);
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

        return new Ctx(authenticate(user.getEmail(), secret), secret, user.getId());
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

    private record Ctx(MockHttpSession session, String secret, Long userId) {
    }
}
