package com.eqms.managementreview;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
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
import com.eqms.managementreview.dto.AddActionItemRequest;
import com.eqms.managementreview.dto.AddAuditResultRequest;
import com.eqms.managementreview.dto.AddMetricRequest;
import com.eqms.managementreview.dto.AddProductFeedbackRequest;
import com.eqms.managementreview.dto.ApproveReviewRequest;
import com.eqms.managementreview.dto.CreateManagementReviewRequest;
import com.eqms.managementreview.dto.RecordDecisionRequest;
import com.eqms.managementreview.dto.UpdateManagementReviewRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@AutoConfigureMockMvc
class ManagementReviewIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsNumberAndStartsScheduled() throws Exception {
        Ctx actor = newUser("ADMIN");
        mockMvc.perform(post("/api/management-reviews").session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateManagementReviewRequest(LocalDate.of(2026, 6, 30),
                                "QA Director, Site Head, QC Manager", "Annual QMS performance review"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SCHEDULED"))
                .andExpect(jsonPath("$.reviewNo").value(matchesPattern("MR-\\d{4}-\\d{3}")));
    }

    @Test
    void fullReviewLifecycle() throws Exception {
        Ctx driver = newUser("ADMIN");   // schedules + captures inputs
        Ctx manager = newUser("ADMIN");  // approves (different user -> no self-approval)

        JsonNode created = create(driver, LocalDate.of(2026, 6, 30));
        long id = created.get("id").asLong();

        // Add QMS metric -> first input transitions SCHEDULED -> IN_PROGRESS
        mockMvc.perform(post("/api/management-reviews/" + id + "/add-metrics")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddMetricRequest("Training Completion %", "98", "H1 2026",
                                MetricTrend.UP, "kpi"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.metrics[0].metricName").value("Training Completion %"));

        // Link audit findings
        mockMvc.perform(post("/api/management-reviews/" + id + "/add-audit-results")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddAuditResultRequest(1L, 0, 2, 5, "audit"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditResults[0].majorFindings").value(2));

        // Link product feedback (complaints, returns)
        mockMvc.perform(post("/api/management-reviews/" + id + "/add-product-feedback")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddProductFeedbackRequest(7, 3, 0, "feedback"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productFeedback[0].complaintsCount").value(7));

        // Define action item with owner
        mockMvc.perform(post("/api/management-reviews/" + id + "/add-action-items")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddActionItemRequest("Revalidate supplier blend process",
                                driver.userId, LocalDate.of(2026, 9, 30), "action"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actionItems[0].status").value("OPEN"));

        // Document management decision
        MvcResult decided = mockMvc.perform(post("/api/management-reviews/" + id + "/record-decision")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordDecisionRequest("Increase QC sampling frequency for incoming API",
                                "Quality Control", "Reduced risk of OOS lots reaching production", "decision"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decisions[0].decisionArea").value("Quality Control"))
                .andReturn();
        int v = version(decided);

        // Generated quality-performance report aggregates the inputs
        mockMvc.perform(get("/api/management-reviews/" + id + "/generated-reports").session(driver.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMajorFindings").value(2))
                .andExpect(jsonPath("$.totalComplaints").value(7))
                .andExpect(jsonPath("$.actionItemsOpen").value(1))
                .andExpect(jsonPath("$.decisionsCount").value(1));

        // A different manager approves and finalizes (self-approval blocked for the driver)
        String code = totpService.generateCode(manager.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/management-reviews/" + id + "/approve")
                        .session(manager.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveReviewRequest(v, "Reviewed and approved", PASSWORD, code, "approve"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.approvedDate").exists());

        // Audit trail populated
        mockMvc.perform(get("/api/management-reviews/" + id + "/audit-trail").session(driver.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void driverCannotSelfApprove() throws Exception {
        Ctx driver = newUser("ADMIN");
        JsonNode created = create(driver, LocalDate.of(2026, 7, 15));
        long id = created.get("id").asLong();

        MvcResult metric = mockMvc.perform(post("/api/management-reviews/" + id + "/add-metrics")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddMetricRequest("Complaints", "10", "Q2", MetricTrend.DOWN, "kpi"))))
                .andExpect(status().isOk()).andReturn();
        int v = version(metric);

        // Same user who drove the review tries to approve -> blocked (rule 7)
        String code = totpService.generateCode(driver.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/management-reviews/" + id + "/approve")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveReviewRequest(v, "self approve", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void previousActionsTrackedInNextReview() throws Exception {
        Ctx driver = newUser("ADMIN");

        // Earlier review with an open action item
        JsonNode earlier = create(driver, LocalDate.of(2026, 1, 15));
        long earlierId = earlier.get("id").asLong();
        mockMvc.perform(post("/api/management-reviews/" + earlierId + "/add-action-items")
                        .session(driver.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddActionItemRequest("Carry-forward: update SOP-200",
                                driver.userId, LocalDate.of(2026, 4, 1), "action"))))
                .andExpect(status().isOk());

        // Next (later) review surfaces the prior review's action items for closure tracking
        JsonNode next = create(driver, LocalDate.of(2026, 6, 30));
        long nextId = next.get("id").asLong();
        mockMvc.perform(get("/api/management-reviews/" + nextId + "/previous-actions").session(driver.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.actionDescription == 'Carry-forward: update SOP-200')]").exists());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx driver = newUser("ADMIN");
        JsonNode created = create(driver, LocalDate.of(2026, 6, 30));
        long id = created.get("id").asLong();
        mockMvc.perform(put("/api/management-reviews/" + id).session(driver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateManagementReviewRequest(99, null, "new participants", null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx op = newUser("OPERATOR");
        mockMvc.perform(post("/api/management-reviews").session(op.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateManagementReviewRequest(LocalDate.of(2026, 6, 30), "x", "y"))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx, LocalDate date) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/management-reviews").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateManagementReviewRequest(date,
                                "QA Director, Site Head", "Periodic QMS review"))))
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
        user.setEmail("mr-" + suffix + "@test.io");
        user.setUsername("mr-" + suffix);
        user.setFullName("MR User " + suffix);
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
