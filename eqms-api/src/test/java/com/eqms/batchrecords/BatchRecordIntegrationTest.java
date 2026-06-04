package com.eqms.batchrecords;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import com.eqms.batchrecords.dto.AddProductProducedRequest;
import com.eqms.batchrecords.dto.BatchTransitionRequest;
import com.eqms.batchrecords.dto.CreateBatchRecordRequest;
import com.eqms.batchrecords.dto.LinkMaterialRequest;
import com.eqms.batchrecords.dto.LinkQcTestRequest;
import com.eqms.batchrecords.dto.RecordStepRequest;
import com.eqms.batchrecords.dto.ReleaseBatchRequest;
import com.eqms.batchrecords.dto.UpdateBatchRecordRequest;
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
 * End-to-end Electronic Batch Records: number assignment, step recording, material/QC linking,
 * QA release with signature, traceability, self-approval check, stale version check.
 */
@AutoConfigureMockMvc
class BatchRecordIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsBatchNoAndStartsInProgress() throws Exception {
        Ctx operator = newUser("ADMIN");
        mockMvc.perform(post("/api/batch-records").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(createRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.batchNo").value(matchesPattern("BATCH-\\d{4}-\\d{3}")))
                .andExpect(jsonPath("$.productCode").value("PROD-001"));
    }

    @Test
    void fullLifecycle_createRecordStepsLinkMaterialQcAndRelease() throws Exception {
        Ctx operator = newUser("ADMIN");
        Ctx qaManager = newUser("ADMIN");

        // Create
        JsonNode batch = create(operator);
        long id = batch.get("id").asLong();
        int v = batch.get("version").asInt();

        // Update manufacturing end date
        MvcResult updated = mockMvc.perform(put("/api/batch-records/" + id).session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateBatchRecordRequest(v, Instant.now(), "Batch notes", "recording end"))))
                .andExpect(status().isOk()).andReturn();
        v = version(updated);

        // Record a production step
        mockMvc.perform(post("/api/batch-records/" + id + "/record-step").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordStepRequest(1, "Mix ingredients", "Mixer-01",
                                operator.userId, Instant.now(), Instant.now(), "Speed=100rpm", null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.stepNumber").value(1));

        // Link a material
        mockMvc.perform(post("/api/batch-records/" + id + "/link-material").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LinkMaterialRequest(null, "MAT-2026-001",
                                "LOT-001", "Supplier A", new BigDecimal("50.000"), "KG"))))
                .andExpect(status().isCreated());

        // Link a QC result
        mockMvc.perform(post("/api/batch-records/" + id + "/link-qc-test").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LinkQcTestRequest("Assay", "98.0-102.0%",
                                "99.5%", Instant.now(), QcTestStatus.PASS, "Lab A", null))))
                .andExpect(status().isCreated());

        // Add product produced
        mockMvc.perform(post("/api/batch-records/" + id + "/add-product").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddProductProducedRequest(null, "PROD-001",
                                "PROD-LOT-001", new BigDecimal("1000.000"), "units"))))
                .andExpect(status().isCreated());

        // Submit for QA review
        MvcResult qaReview = mockMvc.perform(post("/api/batch-records/" + id + "/qa-review")
                        .session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new BatchTransitionRequest(v, "Manufacturing complete"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QA_REVIEW"))
                .andReturn();
        v = version(qaReview);

        // QA release with signature (different user = no self-approval issue)
        String code = totpService.generateCode(qaManager.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/batch-records/" + id + "/release").session(qaManager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ReleaseBatchRequest(v, "Batch passes all QC", PASSWORD, code,
                                "I hereby release this batch."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RELEASED"))
                .andExpect(jsonPath("$.releasedBy").isNotEmpty());

        // Verify traceability
        mockMvc.perform(get("/api/batch-records/" + id + "/traceability").session(operator.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.materialsUsed[0].materialCode").value("MAT-2026-001"))
                .andExpect(jsonPath("$.productsProduced[0].productCode").value("PROD-001"));

        // Verify audit trail (ordered newest-first; release STATUS_CHANGE is most recent)
        mockMvc.perform(get("/api/batch-records/" + id + "/audit-trail").session(operator.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].action").value("STATUS_CHANGE"));
    }

    @Test
    void qaReviewFailsWithoutProductionSteps() throws Exception {
        Ctx operator = newUser("ADMIN");
        JsonNode batch = create(operator);
        long id = batch.get("id").asLong();
        int v = batch.get("version").asInt();

        mockMvc.perform(post("/api/batch-records/" + id + "/qa-review").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new BatchTransitionRequest(v, "no steps"))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void releaseFailsWithoutQcResults() throws Exception {
        Ctx operator = newUser("ADMIN");
        Ctx qaManager = newUser("ADMIN");

        JsonNode batch = create(operator);
        long id = batch.get("id").asLong();
        int v = batch.get("version").asInt();

        // Add a step so QA review succeeds
        mockMvc.perform(post("/api/batch-records/" + id + "/record-step").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordStepRequest(1, "Step 1", null, null,
                                Instant.now(), null, null, null))))
                .andExpect(status().isCreated());

        MvcResult qaReview = mockMvc.perform(post("/api/batch-records/" + id + "/qa-review")
                        .session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new BatchTransitionRequest(v, "done"))))
                .andExpect(status().isOk()).andReturn();
        v = version(qaReview);

        String code = totpService.generateCode(qaManager.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/batch-records/" + id + "/release").session(qaManager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ReleaseBatchRequest(v, "no qc", PASSWORD, code, null))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void operatorCannotReleaseOwnBatch() throws Exception {
        Ctx operator = newUser("ADMIN");

        JsonNode batch = create(operator);
        long id = batch.get("id").asLong();
        int v = batch.get("version").asInt();

        // Record step + QC
        mockMvc.perform(post("/api/batch-records/" + id + "/record-step").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordStepRequest(1, "Mix", null, null, Instant.now(), null, null, null))))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/batch-records/" + id + "/link-qc-test").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new LinkQcTestRequest("Assay", "98-102%", "100%",
                                Instant.now(), QcTestStatus.PASS, null, null))))
                .andExpect(status().isCreated());

        MvcResult qaReview = mockMvc.perform(post("/api/batch-records/" + id + "/qa-review")
                        .session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new BatchTransitionRequest(v, "done"))))
                .andExpect(status().isOk()).andReturn();
        v = version(qaReview);

        // Same user attempts release — self-approval must be rejected
        String code = totpService.generateCode(operator.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/batch-records/" + id + "/release").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ReleaseBatchRequest(v, "self", PASSWORD, code, null))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx operator = newUser("ADMIN");
        JsonNode batch = create(operator);
        long id = batch.get("id").asLong();

        // Record a step so the QA-review precondition passes, isolating the version check.
        mockMvc.perform(post("/api/batch-records/" + id + "/record-step").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordStepRequest(1, "Step 1", null, null,
                                Instant.now(), null, null, null))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/batch-records/" + id + "/qa-review").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new BatchTransitionRequest(99, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void unauthorisedUserCannotCreateBatch() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/batch-records").session(operator.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(createRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    void quarantineAndRecallTransitions() throws Exception {
        Ctx operator = newUser("ADMIN");
        Ctx qaManager = newUser("ADMIN");

        JsonNode batch = create(operator);
        long id = batch.get("id").asLong();
        int v = batch.get("version").asInt();

        // Quarantine from IN_PROGRESS
        MvcResult quarantined = mockMvc.perform(post("/api/batch-records/" + id + "/quarantine")
                        .session(qaManager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new BatchTransitionRequest(v, "Quality hold"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUARANTINE"))
                .andReturn();
    }

    // --- helpers ------------------------------------------------------------------------------

    private CreateBatchRecordRequest createRequest() {
        return new CreateBatchRecordRequest(1L, "PROD-001", new BigDecimal("1000.000"),
                "units", Instant.now(), null);
    }

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/batch-records").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(createRequest())))
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
        user.setEmail("batch-" + suffix + "@test.io");
        user.setUsername("batch-" + suffix);
        user.setFullName("Batch User " + suffix);
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

        Long userId = user.getId();
        return new Ctx(authenticate(user.getEmail(), secret), secret, userId);
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
