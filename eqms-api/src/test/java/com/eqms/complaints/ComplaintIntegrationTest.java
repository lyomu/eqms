package com.eqms.complaints;

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
import com.eqms.complaints.dto.ComplaintTransitionRequest;
import com.eqms.complaints.dto.CreateCapaFromComplaintRequest;
import com.eqms.complaints.dto.CreateComplaintRequest;
import com.eqms.complaints.dto.ImpactAssessmentRequest;
import com.eqms.complaints.dto.InvestigateRequest;
import com.eqms.complaints.dto.ResolveComplaintRequest;
import com.eqms.complaints.dto.RootCauseRequest;
import com.eqms.complaints.dto.SignedTransitionRequest;
import com.eqms.complaints.dto.UpdateComplaintRequest;
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
 * End-to-end Complaint Management: numbering, acknowledge/close signatures, investigation + RCA +
 * impact, CAPA creation from a complaint, the no-self-approval rule on closure, version checks,
 * and backend permission enforcement.
 */
@AutoConfigureMockMvc
class ComplaintIntegrationTest extends AbstractIntegrationTest {

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
        Ctx author = newUser("ADMIN");
        mockMvc.perform(post("/api/complaints").session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateComplaintRequest(1L, "Tablet discoloration reported",
                                ComplaintSource.CUSTOMER, ComplaintSeverity.MAJOR, "Acme Pharmacy"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.source").value("CUSTOMER"))
                .andExpect(jsonPath("$.complaintNo").value(matchesPattern("COMPL-\\d{4}-\\d{3}")));
    }

    @Test
    void fullLifecycleWithCapaAndClosure() throws Exception {
        Ctx author = newUser("ADMIN");   // creates, acknowledges, investigates, resolves
        Ctx closer = newUser("ADMIN");   // independent QA who signs off closure

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Acknowledge (signature, meaning Acknowledged)
        v = signedTransition(author, id, "acknowledge", v, "ACKNOWLEDGED");

        // Investigate + RCA + impact
        MvcResult investigated = mockMvc.perform(post("/api/complaints/" + id + "/investigate").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InvestigateRequest(v, "Confirmed isolated batch issue", "begin"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_INVESTIGATION"))
                .andReturn();
        v = version(investigated);

        mockMvc.perform(post("/api/complaints/" + id + "/root-cause-analysis").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RootCauseRequest("Coating process drift", "5 Whys", "rca"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.investigation.rootCause").value("Coating process drift"));

        mockMvc.perform(post("/api/complaints/" + id + "/impact-assessment").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ImpactAssessmentRequest("One batch affected; no safety risk", "impact"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.investigation.impactOnProduct").value("One batch affected; no safety risk"));

        // Create a CAPA from the complaint
        mockMvc.perform(post("/api/complaints/" + id + "/create-capa").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateCapaFromComplaintRequest(null, "Investigate coating drift",
                                true, null, "systemic"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("COMPLAINT"))
                .andExpect(jsonPath("$.capaNumber").value(matchesPattern("CAPA-\\d{4}-\\d{3}")));

        // Resolve (author becomes submitter)
        MvcResult resolved = mockMvc.perform(post("/api/complaints/" + id + "/resolution").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResolveComplaintRequest(v, "Customer informed; batch quarantined", "resolve"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andReturn();
        v = version(resolved);

        // Close — independent QA signs off
        signedTransition(closer, id, "close", v, "CLOSED");

        // Audit trail is populated
        mockMvc.perform(get("/api/complaints/" + id + "/audit-trail").session(author.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void resolverCannotCloseOwnComplaint() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        v = signedTransition(author, id, "acknowledge", v, "ACKNOWLEDGED");
        MvcResult investigated = mockMvc.perform(post("/api/complaints/" + id + "/investigate").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new InvestigateRequest(v, "findings", "begin"))))
                .andExpect(status().isOk()).andReturn();
        v = version(investigated);
        MvcResult resolved = mockMvc.perform(post("/api/complaints/" + id + "/resolution").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ResolveComplaintRequest(v, "resolved", "resolve"))))
                .andExpect(status().isOk()).andReturn();
        v = version(resolved);

        // Same user (creator + resolver) attempts closure — self-approval prohibited.
        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/complaints/" + id + "/close").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new SignedTransitionRequest(v, "self close", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        mockMvc.perform(put("/api/complaints/" + id).session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateComplaintRequest(99, "x", null, null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/complaints").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateComplaintRequest(1L, "nope", ComplaintSource.INTERNAL,
                                ComplaintSeverity.MINOR, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers -------------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/complaints").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateComplaintRequest(1L, "Foreign particle in vial",
                                ComplaintSource.CUSTOMER, ComplaintSeverity.CRITICAL, "City Hospital"))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private int signedTransition(Ctx ctx, long id, String action, int version, String expectedStatus) throws Exception {
        String code = totpService.generateCode(ctx.secret, totpService.currentTimeStep());
        MvcResult result = mockMvc.perform(post("/api/complaints/" + id + "/" + action).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new SignedTransitionRequest(version, action, PASSWORD, code, action))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedStatus))
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
        user.setEmail("compl-" + suffix + "@test.io");
        user.setUsername("compl-" + suffix);
        user.setFullName("Compl User " + suffix);
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
