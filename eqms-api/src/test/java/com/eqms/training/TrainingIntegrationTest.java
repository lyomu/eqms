package com.eqms.training;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import com.eqms.training.dto.AssignUserRequest;
import com.eqms.training.dto.CreateRuleRequest;
import com.eqms.training.dto.CreateTrainingRequest;
import com.eqms.training.dto.RecordCompletionRequest;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * End-to-end Training Management: program numbering, assignment with derived due date, completion
 * with evidence + completion-audit, auto-rule creation, compliance-status, and permission guards.
 */
@AutoConfigureMockMvc
class TrainingIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsTrainingCode() throws Exception {
        Ctx manager = newUser("ADMIN");
        mockMvc.perform(post("/api/training").session(manager.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateTrainingRequest("Aseptic Gowning", "Gowning procedure",
                                TrainingAudience.MANUFACTURING, TrainingFrequency.ANNUAL))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.intendedAudience").value("MANUFACTURING"))
                .andExpect(jsonPath("$.trainingCode").value(matchesPattern("TRN-\\d{4}-\\d{3}")));
    }

    @Test
    void assignCompleteAndRule() throws Exception {
        Ctx manager = newUser("ADMIN");
        Ctx trainee = newUser("OPERATOR");

        JsonNode program = create(manager);
        long programId = program.get("id").asLong();

        // Assign to the trainee (due date derived from ANNUAL frequency)
        MvcResult assigned = mockMvc.perform(post("/api/training/" + programId + "/assign-user").session(manager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AssignUserRequest(trainee.userId, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.dueDate").isNotEmpty())
                .andReturn();
        JsonNode assignment = objectMapper.readTree(assigned.getResponse().getContentAsString());
        long assignmentId = assignment.get("id").asLong();
        int v = assignment.get("version").asInt();

        // Trainee records completion with evidence
        mockMvc.perform(post("/api/training/" + programId + "/record-completion").session(trainee.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordCompletionRequest(assignmentId, v, "quiz score 95%", "done"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.completionDate").isNotEmpty());

        // Create an auto-assignment rule
        mockMvc.perform(post("/api/training/" + programId + "/create-rule").session(manager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateRuleRequest("SOP_APPROVED", TrainingAudience.MANUFACTURING, 30))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.triggerEvent").value("SOP_APPROVED"));

        // Assignments listing reflects completion
        mockMvc.perform(get("/api/training/" + programId + "/assignments").session(manager.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));

        // Compliance status reflects at least one completed assignment
        mockMvc.perform(get("/api/training/compliance-status").session(manager.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed", greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/training/" + programId + "/audit-trail").session(manager.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void cannotAssignSameUserTwice() throws Exception {
        Ctx manager = newUser("ADMIN");
        Ctx trainee = newUser("OPERATOR");
        long programId = create(manager).get("id").asLong();

        mockMvc.perform(post("/api/training/" + programId + "/assign-user").session(manager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AssignUserRequest(trainee.userId, null))))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/training/" + programId + "/assign-user").session(manager.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new AssignUserRequest(trainee.userId, null))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx operator = newUser("OPERATOR");
        mockMvc.perform(post("/api/training").session(operator.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateTrainingRequest("nope", "x", TrainingAudience.ALL,
                                TrainingFrequency.ON_HIRE))))
                .andExpect(status().isForbidden());
    }

    // --- helpers -------------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/training").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateTrainingRequest("Data Integrity (ALCOA+)", "DI principles",
                                TrainingAudience.ALL, TrainingFrequency.ANNUAL))))
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
        user.setEmail("trn-" + suffix + "@test.io");
        user.setUsername("trn-" + suffix);
        user.setFullName("Trn User " + suffix);
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
