package com.eqms.products;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
import com.eqms.products.dto.ApproveProductRequest;
import com.eqms.products.dto.CreateProductRequest;
import com.eqms.products.dto.ProductTransitionRequest;
import com.eqms.products.dto.UpdateProductRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Product Management: numbering, a detail edit, activation with a signature, on-hold/
 * resume, self-approval rejection, the version check, and backend permission enforcement.
 */
@AutoConfigureMockMvc
class ProductIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void ensureDefaultOrganizationIsWritable() {
        jdbc.update("update organizations set status = 'active', suspended_at = null, read_only_reason = null where id = 1");
        jdbc.update("update organization_licenses set status = 'active', suspended_at = null where organization_id = 1");
    }

    @Test
    void createAssignsProductCodeAndStartsInDraft() throws Exception {
        Ctx author = newUser("ADMIN");
        mockMvc.perform(post("/api/products").session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateProductRequest("Paracetamol 500mg", DosageForm.TABLET, "500mg",
                                "Analgesic", "REG-12345"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.dosageForm").value("TABLET"))
                .andExpect(jsonPath("$.productCode").value(matchesPattern("PROD-\\d{4}-\\d{3}")));
    }

    @Test
    void editActivateAndManageStatusWithSignature() throws Exception {
        Ctx author = newUser("ADMIN");
        Ctx approver = newUser("ADMIN");

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // edit details while in DRAFT
        MvcResult updated = mockMvc.perform(put("/api/products/" + id).session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateProductRequest(v, "Updated description", "250mg", "REG-99", "fix"))))
                .andExpect(status().isOk()).andReturn();
        v = version(updated);

        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");
        seedApprovalEvidence(id, author);

        mockMvc.perform(get("/api/products/" + id + "/iso-readiness").session(author.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(true))
                .andExpect(jsonPath("$.score").value(100));

        // activation signature (different user)
        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        MvcResult approved = mockMvc.perform(post("/api/products/" + id + "/approve").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveProductRequest(v, "Activate", PASSWORD, code, "I approve."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andReturn();
        v = version(approved);

        v = transition(approver, id, "put-on-hold", v, "ON_HOLD");
        transition(approver, id, "resume", v, "ACTIVE");
    }

    @Test
    void authorCannotApproveOwnProduct() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");
        seedApprovalEvidence(id, author);

        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/products/" + id + "/approve").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveProductRequest(v, "self", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void isoReadinessExposesApprovalBlockers() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");

        mockMvc.perform(get("/api/products/" + id + "/iso-readiness").session(author.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ready").value(false))
                .andExpect(jsonPath("$.blockingMessages[0]").exists());

        Ctx approver = newUser("ADMIN");
        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/products/" + id + "/approve").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveProductRequest(v, "Activate", PASSWORD, code, "I approve."))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void staleVersionIsRejectedWithConflict() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        mockMvc.perform(post("/api/products/" + id + "/submit-for-approval").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ProductTransitionRequest(99, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void creatingWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/products").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateProductRequest("Nope", DosageForm.OTHER, null, null, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/products").session(ctx.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateProductRequest("Ibuprofen 200mg", DosageForm.TABLET, "200mg",
                                "NSAID", "REG-1"))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private int transition(Ctx ctx, long id, String action, int version, String expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/products/" + id + "/" + action).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ProductTransitionRequest(version, action))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andReturn();
        return version(result);
    }

    private void seedApprovalEvidence(long id, Ctx ctx) throws Exception {
        mockMvc.perform(post("/api/products/" + id + "/specifications").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"specificationReference":"SPEC-1","documentName":"Product Specification","revision":"A","status":"APPROVED","testParameters":"<p>Assay</p>","acceptanceCriteria":"<p>Within limits</p>"}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/products/" + id + "/documents").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"documentType":"Product Specification","documentName":"Product Specification","documentVersion":"A","status":"APPROVED","notes":"<p>Approved specification document</p>"}
                                """))
                .andExpect(status().isOk());
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
        user.setEmail("prod-" + suffix + "@test.io");
        user.setUsername("prod-" + suffix);
        user.setFullName("Prod User " + suffix);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setMfaSecret(secret);
        user.setMfaEnabled(true);
        user.setStatus(User.UserStatus.ACTIVE);
        user.setOrganizationId(1L);
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
