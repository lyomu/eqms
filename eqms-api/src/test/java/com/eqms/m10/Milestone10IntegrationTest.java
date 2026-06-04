package com.eqms.m10;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.eqms.audit.AuditService;
import com.eqms.auth.dto.LoginRequest;
import com.eqms.auth.dto.MfaVerifyRequest;
import com.eqms.auth.mfa.TotpService;
import com.eqms.documents.DocumentType;
import com.eqms.documents.dto.ActionRequest;
import com.eqms.documents.dto.CreateDocumentRequest;
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.notifications.NotificationType;
import com.eqms.notifications.dto.CreateNotificationRequest;
import com.eqms.shared.constants.AuditAction;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Milestone 10: notification triggers + CRUD, dashboard aggregation, and audited report
 * export. The async notification executor is replaced with a synchronous one so dispatch is
 * deterministically observable within the request.
 */
@AutoConfigureMockMvc
class Milestone10IntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @TestConfiguration
    static class SyncExecutorConfig {
        /** Overrides the production async executor so {@code @Async} dispatch runs inline in tests. */
        @Bean(name = "taskExecutor")
        java.util.concurrent.Executor taskExecutor() {
            return new SyncTaskExecutor();
        }
    }

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;
    @Autowired AuditService auditService;

    // --- Notifications -------------------------------------------------------------------------

    @Test
    void submitForReviewNotifiesReviewers() throws Exception {
        Ctx reviewer = newUser("REVIEWER");   // holds DOCUMENT_REVIEW
        Ctx author = newUser("AUTHOR");        // holds DOCUMENT_CREATE

        // Author creates and submits a document for review.
        MvcResult created = mockMvc.perform(post("/api/documents").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateDocumentRequest("Cleaning SOP", DocumentType.SOP, "body", 12))))
                .andExpect(status().isCreated()).andReturn();
        JsonNode doc = objectMapper.readTree(created.getResponse().getContentAsString());
        long docId = doc.get("id").asLong();
        int v = doc.get("version").asInt();

        mockMvc.perform(post("/api/documents/" + docId + "/submit-for-review").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ActionRequest(v, "ready for review"))))
                .andExpect(status().isOk());

        // The reviewer (freshly created → no other notifications) now sees one for this document.
        mockMvc.perform(get("/api/notifications").session(reviewer.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.recordId=='" + docId + "')]").isNotEmpty())
                .andExpect(jsonPath("$.content[0].type").value("DOCUMENT_SUBMITTED_FOR_REVIEW"));
    }

    @Test
    void notificationMarkReadAndDelete() throws Exception {
        Ctx user = newUser("ADMIN");

        MvcResult created = mockMvc.perform(post("/api/notifications").session(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateNotificationRequest(user.userId, NotificationType.GENERAL,
                                "Welcome", "A general message", null, null))))
                .andExpect(status().isCreated()).andReturn();
        long notifId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/notifications/unread-count").session(user.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unread", greaterThanOrEqualTo(1)));

        mockMvc.perform(post("/api/notifications/" + notifId + "/mark-read").session(user.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        mockMvc.perform(delete("/api/notifications/" + notifId).session(user.session))
                .andExpect(status().isNoContent());
    }

    @Test
    void cannotTouchAnotherUsersNotification() throws Exception {
        Ctx owner = newUser("ADMIN");
        Ctx other = newUser("ADMIN");

        MvcResult created = mockMvc.perform(post("/api/notifications").session(owner.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateNotificationRequest(owner.userId, NotificationType.GENERAL,
                                "Private", "for owner only", null, null))))
                .andExpect(status().isCreated()).andReturn();
        long notifId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/notifications/" + notifId + "/mark-read").session(other.session))
                .andExpect(status().isNotFound());
    }

    // --- Dashboard -----------------------------------------------------------------------------

    @Test
    void dashboardSurfacesPendingApprovalToEligibleApprover() throws Exception {
        Ctx author = newUser("ADMIN");      // can create + push a document to PENDING_APPROVAL
        Ctx qa = newUser("QA_MANAGER");     // holds DOCUMENT_APPROVE + AUDIT_VIEW

        long docId = pushDocumentToPendingApproval(author);

        // The approver sees it in my-approvals (they are not the author, and hold DOCUMENT_APPROVE).
        mockMvc.perform(get("/api/dashboard/my-approvals").session(qa.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.byModule.Document", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.items[?(@.recordId=='" + docId + "')]").isNotEmpty());

        mockMvc.perform(get("/api/dashboard/my-work").session(qa.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingApprovals", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/dashboard/statistics").session(qa.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDocuments", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/dashboard/compliance-status").session(qa.session))
                .andExpect(status().isOk());
    }

    // --- Reports & export ----------------------------------------------------------------------

    @Test
    void documentsReportAndCsvExportIsAudited() throws Exception {
        Ctx admin = newUser("ADMIN"); // holds AUDIT_VIEW

        mockMvc.perform(get("/api/reports/documents").session(admin.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.columns[0]").value("Number"));

        MvcResult export = mockMvc.perform(get("/api/reports/export")
                        .param("type", "DOCUMENTS").param("format", "CSV").session(admin.session))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andReturn();
        String csv = export.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(csv.contains("Audit Reference"),
                "export must carry the audit-trail reference metadata");
        org.junit.jupiter.api.Assertions.assertTrue(csv.contains("Exported By"),
                "export must record who exported it");

        // The EXPORT action is in the audit trail for the Report record.
        boolean hasExport = auditService.trailFor("Report", "DOCUMENTS").stream()
                .anyMatch(e -> e.getAction() == AuditAction.EXPORT);
        org.junit.jupiter.api.Assertions.assertTrue(hasExport, "an EXPORT audit entry must exist");
    }

    @Test
    void xlsxExportReturnsWorkbook() throws Exception {
        Ctx admin = newUser("ADMIN");
        MvcResult export = mockMvc.perform(get("/api/reports/export")
                        .param("type", "CAPA").param("format", "XLSX").session(admin.session))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andReturn();
        byte[] body = export.getResponse().getContentAsByteArray();
        // .xlsx is a ZIP container — first two bytes are 'P','K'.
        org.junit.jupiter.api.Assertions.assertTrue(body.length > 0 && body[0] == 'P' && body[1] == 'K',
                "expected an XLSX (zip) payload");
    }

    @Test
    void exportRequiresAuditViewAuthority() throws Exception {
        Ctx operator = newUser("OPERATOR"); // no AUDIT_VIEW
        mockMvc.perform(get("/api/reports/export").param("type", "DOCUMENTS").session(operator.session))
                .andExpect(status().isForbidden());
    }

    // --- helpers -------------------------------------------------------------------------------

    private long pushDocumentToPendingApproval(Ctx author) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/documents").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateDocumentRequest("Approval SOP", DocumentType.SOP, "body", 12))))
                .andExpect(status().isCreated()).andReturn();
        JsonNode doc = objectMapper.readTree(created.getResponse().getContentAsString());
        long docId = doc.get("id").asLong();
        int v = doc.get("version").asInt();

        MvcResult review = mockMvc.perform(post("/api/documents/" + docId + "/submit-for-review").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ActionRequest(v, "review"))))
                .andExpect(status().isOk()).andReturn();
        v = objectMapper.readTree(review.getResponse().getContentAsString()).get("version").asInt();

        mockMvc.perform(post("/api/documents/" + docId + "/submit-for-approval").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ActionRequest(v, "approve please"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_APPROVAL"));
        return docId;
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private Ctx newUser(String roleName) throws Exception {
        String secret = totpService.generateSecret();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("m10-" + suffix + "@test.io");
        user.setUsername("m10-" + suffix);
        user.setFullName("M10 User " + suffix);
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
