package com.eqms.nonconformance;

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
import com.eqms.nonconformance.dto.CloseNcRequest;
import com.eqms.nonconformance.dto.CreateCapaFromNcRequest;
import com.eqms.nonconformance.dto.CreateNonConformanceRequest;
import com.eqms.nonconformance.dto.DetermineNcDispositionRequest;
import com.eqms.nonconformance.dto.ImplementActionRequest;
import com.eqms.nonconformance.dto.InvestigateNcRequest;
import com.eqms.nonconformance.dto.UpdateNonConformanceRequest;
import com.eqms.nonconformance.dto.UseAsIsApprovalRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@AutoConfigureMockMvc
class NonConformanceIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsNumberAndStartsOpen() throws Exception {
        Ctx actor = newUser("ADMIN");
        mockMvc.perform(post("/api/non-conformances").session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateNonConformanceRequest("Discolored API lot",
                                "Lot shows off-white discoloration vs spec", NcType.MATERIAL,
                                10L, "Material", "QC Inspector"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.ncType").value("MATERIAL"))
                .andExpect(jsonPath("$.ncNo").value(matchesPattern("NC-\\d{4}-\\d{3}")));
    }

    @Test
    void reworkLifecycleWithCapaAndClosure() throws Exception {
        Ctx author = newUser("ADMIN");   // creates, investigates, implements
        Ctx approver = newUser("ADMIN"); // approves disposition, closes

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Investigate + root cause
        MvcResult investigated = mockMvc.perform(post("/api/non-conformances/" + id + "/investigate")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InvestigateNcRequest(v, "Supplier blending step inconsistent",
                                "Inadequate supplier blend validation", "begin"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INVESTIGATING"))
                .andExpect(jsonPath("$.investigation.rootCause").value("Inadequate supplier blend validation"))
                .andReturn();
        v = version(investigated);

        // Determine REWORK disposition (requires rework specs + signature), approver signs
        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        MvcResult disposed = mockMvc.perform(post("/api/non-conformances/" + id + "/determine-disposition")
                        .session(approver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DetermineNcDispositionRequest(v, NcDisposition.REWORK,
                                "Material can be reworked to spec", "Re-blend per SOP-123 and re-test assay",
                                PASSWORD, code, "approve", "rework"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPOSITION_APPROVED"))
                .andExpect(jsonPath("$.disposition.disposition").value("REWORK"))
                .andExpect(jsonPath("$.disposition.reworkSpecifications").value("Re-blend per SOP-123 and re-test assay"))
                .andReturn();
        v = version(disposed);

        // Create CAPA for systemic issue
        mockMvc.perform(post("/api/non-conformances/" + id + "/create-capa")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaFromNcRequest(null, "Improve supplier blend validation",
                                true, null, "systemic"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capaNumber").value(matchesPattern("CAPA-\\d{4}-\\d{3}")));

        // Implement action — verify rework completion
        MvcResult implemented = mockMvc.perform(post("/api/non-conformances/" + id + "/implement-action")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ImplementActionRequest(v, true, "rework complete and verified"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTION_IMPLEMENTED"))
                .andExpect(jsonPath("$.disposition.reworkCompleted").value(true))
                .andReturn();
        v = version(implemented);

        // Close — approver signs off (self-approval prevented since approver determined disposition)
        Ctx closer = newUser("ADMIN");
        String closeCode = totpService.generateCode(closer.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/non-conformances/" + id + "/close").session(closer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CloseNcRequest(v, "All actions complete", PASSWORD, closeCode, "close"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        // Audit trail populated
        mockMvc.perform(get("/api/non-conformances/" + id + "/audit-trail").session(author.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void reworkDispositionRequiresSpecifications() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        v = version(mockMvc.perform(post("/api/non-conformances/" + id + "/investigate")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InvestigateNcRequest(v, "findings", "cause", "begin"))))
                .andExpect(status().isOk()).andReturn());

        // REWORK without specs → 400
        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/non-conformances/" + id + "/determine-disposition")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DetermineNcDispositionRequest(v, NcDisposition.REWORK,
                                "rework it", null, PASSWORD, code, "approve", "rework"))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void useAsIsRequiresSpecialApprovalFirst() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        v = version(mockMvc.perform(post("/api/non-conformances/" + id + "/investigate")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InvestigateNcRequest(v, "minor cosmetic issue", "cause", "begin"))))
                .andExpect(status().isOk()).andReturn());

        // USE_AS_IS without special approval → 400
        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/non-conformances/" + id + "/determine-disposition")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DetermineNcDispositionRequest(v, NcDisposition.USE_AS_IS,
                                "acceptable", null, PASSWORD, code, "approve", "uai"))))
                .andExpect(status().isUnprocessableEntity());

        // Grant special approval
        String code2 = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/non-conformances/" + id + "/request-approval")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UseAsIsApprovalRequest("Cosmetic only; no impact on quality or safety",
                                "Risk assessed as negligible", PASSWORD, code2, "uai-approve", "approve"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.useAsIsApproval.useAsIsJustification")
                        .value("Cosmetic only; no impact on quality or safety"));

        // Now USE_AS_IS disposition succeeds
        String code3 = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/non-conformances/" + id + "/determine-disposition")
                        .session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new DetermineNcDispositionRequest(v, NcDisposition.USE_AS_IS,
                                "acceptable per approved justification", null, PASSWORD, code3, "approve", "uai"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISPOSITION_APPROVED"))
                .andExpect(jsonPath("$.disposition.disposition").value("USE_AS_IS"));
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        mockMvc.perform(put("/api/non-conformances/" + id).session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateNonConformanceRequest(99, "x", null, null, null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx op = newUser("OPERATOR");
        mockMvc.perform(post("/api/non-conformances").session(op.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateNonConformanceRequest("x", "y", NcType.PROCESS, null, null, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/non-conformances").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateNonConformanceRequest("Out-of-spec assay result",
                                "Tablet assay below lower spec limit", NcType.PRODUCT,
                                20L, "BatchRecord", "QC Analyst"))))
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
        user.setEmail("nc-" + suffix + "@test.io");
        user.setUsername("nc-" + suffix);
        user.setFullName("NC User " + suffix);
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
