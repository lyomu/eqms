package com.eqms.risks;

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
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.risks.dto.AcceptRiskRequest;
import com.eqms.risks.dto.CreateRiskRequest;
import com.eqms.risks.dto.HazardAnalysisRequest;
import com.eqms.risks.dto.ImplementControlsRequest;
import com.eqms.risks.dto.MitigationPlanRequest;
import com.eqms.risks.dto.RiskTransitionRequest;
import com.eqms.risks.dto.UpdateRiskRequest;
import com.eqms.risks.dto.VerifyEffectivenessRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Risk Management: numbering, computed risk score, hazard analysis -> mitigation ->
 * implement -> verify -> management acceptance (signature) -> close, the residual-acceptability and
 * no-self-approval gates, version checks, and permission guards.
 */
@AutoConfigureMockMvc
class RiskIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsNumberAndIdentified() throws Exception {
        Ctx owner = newUser("ADMIN");
        mockMvc.perform(post("/api/risks").session(owner.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateRiskRequest("Cross-contamination risk", RiskCategory.PROCESS,
                                "Shared equipment between products", "Patient safety / product quality"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IDENTIFIED"))
                .andExpect(jsonPath("$.category").value("PROCESS"))
                .andExpect(jsonPath("$.riskNo").value(matchesPattern("RISK-\\d{4}-\\d{3}")));
    }

    @Test
    void fullLifecycleToAcceptanceAndClose() throws Exception {
        Ctx owner = newUser("ADMIN");
        Ctx management = newUser("ADMIN"); // independent acceptance

        JsonNode created = create(owner);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Hazard analysis: severity 4 × probability 4 = inherent score 16
        MvcResult analyzed = mockMvc.perform(post("/api/risks/" + id + "/hazard-analysis").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new HazardAnalysisRequest(v, AnalysisMethod.FMEA, "RPN elevated",
                                "Potential mix-up", 4, 4, "analysis"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ANALYZED"))
                .andExpect(jsonPath("$.riskScore").value(16))
                .andExpect(jsonPath("$.analysis.severity").value(4))
                .andReturn();
        v = version(analyzed);

        // Plan a mitigation control
        mockMvc.perform(post("/api/risks/" + id + "/mitigation-plan").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MitigationPlanRequest("Dedicated equipment", ControlType.DESIGN,
                                null, "Visual + swab test", "plan"))))
                .andExpect(status().isCreated());

        // Implement controls -> MITIGATED
        MvcResult mitigated = mockMvc.perform(post("/api/risks/" + id + "/implement-controls").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ImplementControlsRequest(v, "rolled out"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MITIGATED"))
                .andReturn();
        v = version(mitigated);

        // Verify effectiveness — residual acceptable
        mockMvc.perform(post("/api/risks/" + id + "/verify-effectiveness").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new VerifyEffectivenessRequest(4, true, "Swab results within limits", "verify"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analysis.residualRiskScore").value(4))
                .andExpect(jsonPath("$.effectivenessChecks[0].residualRiskAcceptable").value(true));

        // Management acceptance (signature) by an independent user
        String code = totpService.generateCode(management.secret, totpService.currentTimeStep());
        MvcResult accepted = mockMvc.perform(post("/api/risks/" + id + "/accept").session(management.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AcceptRiskRequest(v, "residual acceptable", PASSWORD, code, "I accept."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.acceptedBy").isNotEmpty())
                .andReturn();
        v = version(accepted);

        // Close
        mockMvc.perform(post("/api/risks/" + id + "/close").session(management.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RiskTransitionRequest(v, "monitoring in place"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        mockMvc.perform(get("/api/risks/" + id + "/audit-trail").session(owner.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void cannotAcceptWhenResidualNotAcceptable() throws Exception {
        Ctx owner = newUser("ADMIN");
        Ctx management = newUser("ADMIN");
        long id = mitigateToVerify(owner, false); // residual NOT acceptable
        int v = currentVersion(owner, id);

        String code = totpService.generateCode(management.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/risks/" + id + "/accept").session(management.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AcceptRiskRequest(v, "try", PASSWORD, code, "accept"))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void ownerCannotAcceptOwnRisk() throws Exception {
        Ctx owner = newUser("ADMIN"); // has RISK_APPROVE too
        long id = mitigateToVerify(owner, true);
        int v = currentVersion(owner, id);

        String code = totpService.generateCode(owner.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/risks/" + id + "/accept").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AcceptRiskRequest(v, "self", PASSWORD, code, "accept"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void implementRequiresAtLeastOneControl() throws Exception {
        Ctx owner = newUser("ADMIN");
        JsonNode created = create(owner);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        MvcResult analyzed = mockMvc.perform(post("/api/risks/" + id + "/hazard-analysis").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new HazardAnalysisRequest(v, AnalysisMethod.HAZOP, "f", "c", 3, 3, "a"))))
                .andExpect(status().isOk()).andReturn();
        v = version(analyzed);
        mockMvc.perform(post("/api/risks/" + id + "/implement-controls").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ImplementControlsRequest(v, "no controls"))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx owner = newUser("ADMIN");
        long id = create(owner).get("id").asLong();
        mockMvc.perform(put("/api/risks/" + id).session(owner.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateRiskRequest(99, "x", null, null, null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/risks").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateRiskRequest("nope", RiskCategory.PRODUCT, "d", "i"))))
                .andExpect(status().isForbidden());
    }

    // --- helpers -------------------------------------------------------------------------------

    /** Drive a risk from creation through verify-effectiveness; returns the risk id. */
    private long mitigateToVerify(Ctx owner, boolean residualAcceptable) throws Exception {
        JsonNode created = create(owner);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = version(mockMvc.perform(post("/api/risks/" + id + "/hazard-analysis").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new HazardAnalysisRequest(v, AnalysisMethod.FMEA, "f", "c", 5, 5, "a"))))
                .andExpect(status().isOk()).andReturn());
        mockMvc.perform(post("/api/risks/" + id + "/mitigation-plan").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MitigationPlanRequest("control", ControlType.PROCESS, null, "method", "plan"))))
                .andExpect(status().isCreated());
        v = version(mockMvc.perform(post("/api/risks/" + id + "/implement-controls").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ImplementControlsRequest(v, "impl"))))
                .andExpect(status().isOk()).andReturn());
        mockMvc.perform(post("/api/risks/" + id + "/verify-effectiveness").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new VerifyEffectivenessRequest(6, residualAcceptable, "evidence", "verify"))))
                .andExpect(status().isOk());
        return id;
    }

    private int currentVersion(Ctx ctx, long id) throws Exception {
        MvcResult r = mockMvc.perform(get("/api/risks/" + id).session(ctx.session))
                .andExpect(status().isOk()).andReturn();
        return version(r);
    }

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/risks").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateRiskRequest("Equipment failure risk", RiskCategory.EQUIPMENT,
                                "HVAC failure in suite B", "Environmental excursion"))))
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
        user.setEmail("risk-" + suffix + "@test.io");
        user.setUsername("risk-" + suffix);
        user.setFullName("Risk User " + suffix);
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
