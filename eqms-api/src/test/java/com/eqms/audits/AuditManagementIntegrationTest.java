package com.eqms.audits;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.eqms.audits.dto.AuditTransitionRequest;
import com.eqms.audits.dto.CreateAuditRequest;
import com.eqms.audits.dto.CreateCapaFromFindingRequest;
import com.eqms.audits.dto.FinalizeAuditRequest;
import com.eqms.audits.dto.PlanAuditRequest;
import com.eqms.audits.dto.RecordFindingRequest;
import com.eqms.audits.dto.RecordFollowUpRequest;
import com.eqms.audits.dto.UpdateAuditRequest;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Audit Management: numbering, plan -> findings -> CAPA-from-finding -> finalize sign-off,
 * follow-up tracking, the no-self-approval rule on finalize, version checks, and permission guards.
 */
@AutoConfigureMockMvc
class AuditManagementIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsNumberAndStartsPlanned() throws Exception {
        Ctx manager = newUser("ADMIN");
        mockMvc.perform(post("/api/audits").session(manager.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateAuditRequest("Q3 Internal GMP Audit", AuditType.INTERNAL,
                                "Warehouse and QC lab", "Verify GMP compliance", "ISO 13485 clause 8.2",
                                Instant.now(), null, null, null, null, null, null, null, null, null,
                                null, null, null, null, null, null, null, null, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PLANNED"))
                .andExpect(jsonPath("$.auditType").value("INTERNAL"))
                .andExpect(jsonPath("$.auditNo").value(matchesPattern("AUD-\\d{4}-\\d{3}")));
    }

    @Test
    void fullLifecycleWithFindingCapaAndFollowUp() throws Exception {
        Ctx auditor = newUser("ADMIN");   // creates + plans + records findings + creates CAPA
        Ctx approver = newUser("ADMIN");  // independent sign-off

        JsonNode created = create(auditor);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = confirmAuditorIndependence(auditor, id, v);

        // Plan -> IN_PROGRESS
        MvcResult planned = mockMvc.perform(post("/api/audits/" + id + "/plan").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new PlanAuditRequest(v, "Full scope", null, Instant.now(), "begin"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andReturn();
        v = version(planned);

        // Record a critical finding
        MvcResult finding = mockMvc.perform(post("/api/audits/" + id + "/record-finding").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordFindingRequest("Gowning SOP not followed", "Cleanroom",
                                FindingSeverity.CRITICAL, "Photo evidence", null, false))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.findingNumber").value(1))
                .andExpect(jsonPath("$.correctiveActionRequired").value(true)) // critical forces CA
                .andReturn();
        long findingId = objectMapper.readTree(finding.getResponse().getContentAsString()).get("id").asLong();

        // Create a CAPA from that finding
        mockMvc.perform(post("/api/audits/" + id + "/create-capa").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaFromFindingRequest(findingId, null, null, true, null, "critical"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("AUDIT_FINDING"))
                .andExpect(jsonPath("$.capaNumber").value(matchesPattern("CAPA-\\d{4}-\\d{3}")));

        // Finalize — independent approver signs off (auditor cannot sign off own audit)
        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        MvcResult finalized = mockMvc.perform(post("/api/audits/" + id + "/finalize").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new FinalizeAuditRequest(v, "audit complete", PASSWORD, code, "I approve."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andReturn();
        v = version(finalized);

        // Follow-up on a previous audit -> moves this completed audit into FOLLOW_UP
        long previousAuditId = create(auditor).get("id").asLong();
        mockMvc.perform(post("/api/audits/" + id + "/record-follow-up").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordFollowUpRequest(v, previousAuditId, null,
                                FollowUpStatus.STILL_OPEN, "Prior finding still open", "follow up"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/audits/" + id + "/follow-up").session(auditor.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/audits/" + id).session(auditor.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FOLLOW_UP"));

        mockMvc.perform(get("/api/audits/" + id + "/audit-trail").session(auditor.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void auditorCannotSignOffOwnAudit() throws Exception {
        Ctx auditor = newUser("ADMIN"); // has both AUDIT_MANAGE and AUDIT_APPROVE
        JsonNode created = create(auditor);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = confirmAuditorIndependence(auditor, id, v);

        MvcResult planned = mockMvc.perform(post("/api/audits/" + id + "/plan").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new PlanAuditRequest(v, "scope", null, Instant.now(), "begin"))))
                .andExpect(status().isOk()).andReturn();
        v = version(planned);

        String code = totpService.generateCode(auditor.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/audits/" + id + "/finalize").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new FinalizeAuditRequest(v, "self", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void findingsOnlyWhileInProgress() throws Exception {
        Ctx auditor = newUser("ADMIN");
        JsonNode created = create(auditor);
        long id = created.get("id").asLong();
        // Still PLANNED — recording a finding must be rejected.
        mockMvc.perform(post("/api/audits/" + id + "/record-finding").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordFindingRequest("too early", null, FindingSeverity.MINOR, null, null, false))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx auditor = newUser("ADMIN");
        JsonNode created = create(auditor);
        long id = created.get("id").asLong();
        mockMvc.perform(put("/api/audits/" + id).session(auditor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateAuditRequest(99, "x", null, null, null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/audits").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateAuditRequest("nope", AuditType.SUPPLIER, "scope",
                                "objective", "criteria", null, null,
                                null, null, null, null, null, null, null, null,
                                null, null, null, null, null, null, null, null, null))))
                .andExpect(status().isForbidden());
    }

    @Test
    void cancelFromPlanned() throws Exception {
        Ctx auditor = newUser("ADMIN");
        JsonNode created = create(auditor);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        mockMvc.perform(post("/api/audits/" + id + "/cancel").session(auditor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AuditTransitionRequest(v, "duplicate"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // --- helpers -------------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/audits").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateAuditRequest("Supplier Qualification Audit", AuditType.SUPPLIER,
                                "Raw material supplier", "Verify supplier quality system", "ISO 9001 clause 8.4",
                                Instant.now(), null, null, null, null, null, null, null, null, null,
                                null, null, null, null, null, null, null, null, null))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private int confirmAuditorIndependence(Ctx ctx, long id, int version) throws Exception {
        MvcResult result = mockMvc.perform(patch("/api/audits/" + id).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "expectedVersion", version,
                                "reason", "Confirm independence",
                                "auditorIndependenceConfirmed", true))))
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
        user.setEmail("aud-" + suffix + "@test.io");
        user.setUsername("aud-" + suffix);
        user.setFullName("Aud User " + suffix);
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
