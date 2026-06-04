package com.eqms.suppliers;

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
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.suppliers.dto.CreateCapaFromFindingRequest;
import com.eqms.suppliers.dto.CreateSupplierRequest;
import com.eqms.suppliers.dto.IssueFindingRequest;
import com.eqms.suppliers.dto.QualifySupplierRequest;
import com.eqms.suppliers.dto.RecordPerformanceRequest;
import com.eqms.suppliers.dto.UpdateSupplierRequest;
import com.eqms.suppliers.dto.UploadCertificateRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Supplier Quality: code numbering, signed qualification with no-self-approval,
 * certificates / performance / findings, CAPA-from-finding, version checks, and permission guards.
 */
@AutoConfigureMockMvc
class SupplierIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsCodeAndStartsUnapproved() throws Exception {
        Ctx buyer = newUser("ADMIN");
        mockMvc.perform(post("/api/suppliers").session(buyer.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateSupplierRequest("Acme Excipients", SupplierType.RAW_MATERIAL,
                                "Jane Doe", "jane@acme.io", "+1-555", "New Jersey, USA"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("UNAPPROVED"))
                .andExpect(jsonPath("$.supplierType").value("RAW_MATERIAL"))
                .andExpect(jsonPath("$.supplierCode").value(matchesPattern("SUP-\\d{4}-\\d{3}")));
    }

    @Test
    void fullLifecycleQualifyCertifyPerformAndFindingCapa() throws Exception {
        Ctx buyer = newUser("ADMIN");   // creates supplier + records data
        Ctx qa = newUser("ADMIN");      // independent qualifier

        JsonNode created = create(buyer);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Upload a certificate
        mockMvc.perform(post("/api/suppliers/" + id + "/upload-certificate").session(buyer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UploadCertificateRequest("ISO 9001", Instant.now(),
                                Instant.now().plusSeconds(31536000L), "/certs/iso9001.pdf"))))
                .andExpect(status().isCreated());

        // Record performance
        mockMvc.perform(post("/api/suppliers/" + id + "/record-performance").session(buyer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordPerformanceRequest(Instant.now().minusSeconds(86400),
                                Instant.now(), new BigDecimal("98.50"), new BigDecimal("99.10"), 4))))
                .andExpect(status().isCreated());

        // Qualify — independent QA signs off
        String code = totpService.generateCode(qa.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/suppliers/" + id + "/qualify").session(qa.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new QualifySupplierRequest(v, "On-site audit + dossier review",
                                "Approved", "qualified", PASSWORD, code, "I qualify."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUALIFIED"))
                .andExpect(jsonPath("$.qualificationDate").isNotEmpty());

        // Issue a finding and raise a CAPA from it
        MvcResult finding = mockMvc.perform(post("/api/suppliers/" + id + "/issue-finding").session(buyer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new IssueFindingRequest("Late deliveries trending up", FindingSeverity.MAJOR,
                                null, true))))
                .andExpect(status().isCreated())
                .andReturn();
        long findingId = objectMapper.readTree(finding.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/suppliers/" + id + "/create-capa").session(buyer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaFromFindingRequest(findingId, null, null, true, null, "supplier issue"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("SUPPLIER"))
                .andExpect(jsonPath("$.capaNumber").value(matchesPattern("CAPA-\\d{4}-\\d{3}")));

        // Sub-resource history endpoints
        mockMvc.perform(get("/api/suppliers/" + id + "/certifications").session(buyer.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].certType").value("ISO 9001"));
        mockMvc.perform(get("/api/suppliers/" + id + "/performance-history").session(buyer.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].onTimeDeliveryPct").value(98.50));
        mockMvc.perform(get("/api/suppliers/" + id + "/audit-history").session(buyer.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].approvalStatus").value("QUALIFIED"));

        mockMvc.perform(get("/api/suppliers/" + id + "/audit-trail").session(buyer.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void creatorCannotQualifyOwnSupplier() throws Exception {
        Ctx buyer = newUser("ADMIN"); // has SUPPLIER_APPROVE too
        JsonNode created = create(buyer);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        String code = totpService.generateCode(buyer.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/suppliers/" + id + "/qualify").session(buyer.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new QualifySupplierRequest(v, "self audit", null, "self",
                                PASSWORD, code, "qualify"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx buyer = newUser("ADMIN");
        long id = create(buyer).get("id").asLong();
        mockMvc.perform(put("/api/suppliers/" + id).session(buyer.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateSupplierRequest(99, "x", null, null, null, null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/suppliers").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateSupplierRequest("nope", SupplierType.SERVICE, null, null, null, "x"))))
                .andExpect(status().isForbidden());
    }

    // --- helpers -------------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/suppliers").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateSupplierRequest("Beta Packaging Ltd", SupplierType.PACKAGING,
                                "John Roe", "john@beta.io", "+44-20", "Manchester, UK"))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private Ctx newUser(String roleName) throws Exception {
        String secret = totpService.generateSecret();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("sup-" + suffix + "@test.io");
        user.setUsername("sup-" + suffix);
        user.setFullName("Sup User " + suffix);
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
