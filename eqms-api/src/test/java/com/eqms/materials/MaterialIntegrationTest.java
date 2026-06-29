package com.eqms.materials;

import static org.hamcrest.Matchers.matchesPattern;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.eqms.auth.dto.LoginRequest;
import com.eqms.auth.dto.MfaVerifyRequest;
import com.eqms.auth.mfa.TotpService;
import com.eqms.comments.dto.AddRecordCommentRequest;
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.materials.dto.ApproveMaterialRequest;
import com.eqms.materials.dto.CreateMaterialRequest;
import com.eqms.materials.dto.MaterialTransitionRequest;
import com.eqms.materials.dto.UpdateMaterialRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Material Management: numbering, a detail edit, approval with a signature, hold/release,
 * self-approval rejection, the version check, and backend permission enforcement.
 */
@AutoConfigureMockMvc
class MaterialIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbc;

    @Test
    void createAssignsMaterialCodeAndStartsInDraft() throws Exception {
        Ctx author = newUser("ADMIN");
        mockMvc.perform(post("/api/materials").session(author.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(materialRequest("Microcrystalline Cellulose", MaterialType.EXCIPIENT,
                                UnitOfMeasure.KG, "USP grade", "Binder"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.materialType").value("EXCIPIENT"))
                .andExpect(jsonPath("$.materialCode").value(matchesPattern("MAT-\\d{4}-\\d{3}")));
    }

    @Test
    void editApproveAndManageStatusWithSignature() throws Exception {
        Ctx author = newUser("ADMIN");
        Ctx approver = newUser("ADMIN");

        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        MvcResult updated = mockMvc.perform(put("/api/materials/" + id).session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateMaterialRequest(v, "Updated description", "USP/EP grade", "fix"))))
                .andExpect(status().isOk()).andReturn();
        v = version(updated);

        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");
        addReadinessComment(author, id, "Specification and material approval evidence reviewed.");

        String code = totpService.generateCode(approver.secret, totpService.currentTimeStep());
        MvcResult approved = mockMvc.perform(post("/api/materials/" + id + "/approve").session(approver.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveMaterialRequest(v, "Approve for use", PASSWORD, code, "I approve."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();
        v = version(approved);

        v = transition(approver, id, "put-on-hold", v, "ON_HOLD");
        transition(approver, id, "release", v, "APPROVED");
    }

    @Test
    void authorCannotApproveOwnMaterial() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();
        v = transition(author, id, "submit-for-approval", v, "PENDING_APPROVAL");

        String code = totpService.generateCode(author.secret, totpService.currentTimeStep());
        mockMvc.perform(post("/api/materials/" + id + "/approve").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ApproveMaterialRequest(v, "self", PASSWORD, code, "approve"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleVersionIsRejectedWithConflict() throws Exception {
        Ctx author = newUser("ADMIN");
        JsonNode created = create(author);
        long id = created.get("id").asLong();
        mockMvc.perform(post("/api/materials/" + id + "/submit-for-approval").session(author.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MaterialTransitionRequest(99, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void creatingWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/materials").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(materialRequest("Nope", MaterialType.OTHER, UnitOfMeasure.UNIT, null, null))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/materials").session(ctx.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(materialRequest("Lactose Monohydrate", MaterialType.EXCIPIENT,
                                UnitOfMeasure.KG, "USP", "Filler"))))
                .andExpect(status().isCreated()).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private CreateMaterialRequest materialRequest(String name, MaterialType materialType, UnitOfMeasure unitOfMeasure,
            String specification, String description) {
        return new CreateMaterialRequest(
                name,
                materialType,
                unitOfMeasure,
                specification,
                description,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                false,
                null,
                null,
                null,
                null,
                false,
                false,
                null,
                null);
    }

    private int transition(Ctx ctx, long id, String action, int version, String expectedStatus) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/materials/" + id + "/" + action).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new MaterialTransitionRequest(version, action))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andReturn();
        return version(result);
    }

    private int version(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("version").asInt();
    }

    private void addReadinessComment(Ctx ctx, long id, String content) throws Exception {
        mockMvc.perform(post("/api/comments/Material/" + id).session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AddRecordCommentRequest(content))))
                .andExpect(status().isCreated());
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private Ctx newUser(String roleName) throws Exception {
        String secret = totpService.generateSecret();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Long orgId = jdbc.queryForObject("""
                insert into organizations (code, name, status, version, created_at, updated_at)
                values (?, ?, 'active', 0, now(), now())
                returning id
                """, Long.class, "MAT-" + suffix, "Material Test Org " + suffix);
        jdbc.update("""
                insert into organization_licenses (organization_id, status, user_limit, starts_at, expires_at, version, created_at, updated_at)
                values (?, 'active', 25, now(), now() + interval '30 days', 0, now(), now())
                """, orgId);
        jdbc.update("""
                insert into organization_module_licenses (organization_id, module_id, enabled, status, starts_at, expires_at, version, created_at, updated_at)
                select ?, id, true, 'active', now(), now() + interval '30 days', 0, now(), now()
                from modules
                where code = 'materials'
                on conflict (organization_id, module_id) do update
                  set enabled = excluded.enabled, status = excluded.status, updated_at = now()
                """, orgId);
        User user = new User();
        user.setOrganizationId(orgId);
        user.setEmail("mat-" + suffix + "@test.io");
        user.setUsername("mat-" + suffix);
        user.setFullName("Mat User " + suffix);
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
