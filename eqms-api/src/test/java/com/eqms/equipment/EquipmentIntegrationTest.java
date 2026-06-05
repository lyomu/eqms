package com.eqms.equipment;

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
import com.eqms.equipment.dto.CalibrationFailRequest;
import com.eqms.equipment.dto.CalibrationPassRequest;
import com.eqms.equipment.dto.CreateEquipmentRequest;
import com.eqms.equipment.dto.EquipmentTransitionRequest;
import com.eqms.equipment.dto.RecordMaintenanceRequest;
import com.eqms.equipment.dto.ScheduleCalibrationRequest;
import com.eqms.equipment.dto.UpdateEquipmentRequest;
import com.eqms.identity.Role;
import com.eqms.identity.RoleRepository;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.identity.UserRole;
import com.eqms.identity.UserRoleRepository;
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@AutoConfigureMockMvc
class EquipmentIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;

    @Test
    void createAssignsCodeAndStartsRegistered() throws Exception {
        Ctx actor = newUser("ADMIN");
        mockMvc.perform(post("/api/equipment").session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateEquipmentRequest(
                                "Analytical Balance", EquipmentType.BALANCE,
                                "Mettler Toledo", "XPE205", "SN-001",
                                "Lab A", null, 12))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REGISTERED"))
                .andExpect(jsonPath("$.equipmentCode").value(matchesPattern("EQUIP-\\d{4}-\\d{3}")));
    }

    @Test
    void fullCalibrationLifecycle() throws Exception {
        Ctx actor = newUser("ADMIN");

        JsonNode created = create(actor);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Schedule calibration
        MvcResult scheduled = mockMvc.perform(post("/api/equipment/" + id + "/schedule-calibration")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new ScheduleCalibrationRequest(v, LocalDate.now().plusDays(7), "routine"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextCalibrationDate").isNotEmpty())
                .andReturn();
        v = version(scheduled);

        // Calibration pass — equipment moves to IN_CALIBRATION
        MvcResult passed = mockMvc.perform(post("/api/equipment/" + id + "/calibration-pass")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CalibrationPassRequest(v, LocalDate.now(), "Lab Tech",
                                LocalDate.now().plusDays(7), "/certs/001.pdf", "All within tolerance", "pass"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_CALIBRATION"))
                .andExpect(jsonPath("$.lastCalibrationDate").isNotEmpty())
                .andReturn();
        v = version(passed);

        // Calibration history has one entry
        mockMvc.perform(get("/api/equipment/" + id + "/calibration-history").session(actor.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].results").value("PASS"));

        // Calibration fail — equipment moves to OUT_OF_CALIBRATION
        mockMvc.perform(post("/api/equipment/" + id + "/calibration-fail")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CalibrationFailRequest(v, LocalDate.now(), "Lab Tech",
                                null, null, "Drift detected beyond tolerance", "fail"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OUT_OF_CALIBRATION"));

        // Appears in out-of-calibration list (DB is shared across tests, so assert presence, not position)
        mockMvc.perform(get("/api/equipment/out-of-calibration").session(actor.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").exists());

        // Audit trail is populated
        mockMvc.perform(get("/api/equipment/" + id + "/audit-trail").session(actor.session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void maintenanceIsRecorded() throws Exception {
        Ctx actor = newUser("ADMIN");
        JsonNode created = create(actor);
        long id = created.get("id").asLong();

        mockMvc.perform(post("/api/equipment/" + id + "/maintenance")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new RecordMaintenanceRequest(LocalDate.now(),
                                MaintenanceType.PREVENTIVE, "Annual PM completed", "Tech A", null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.maintenanceType").value("PREVENTIVE"));
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        Ctx actor = newUser("ADMIN");
        JsonNode created = create(actor);
        long id = created.get("id").asLong();
        mockMvc.perform(put("/api/equipment/" + id).session(actor.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateEquipmentRequest(99, null, "New Lab", null, null, "stale"))))
                .andExpect(status().isConflict());
    }

    @Test
    void retiredEquipmentCannotBeCalibrated() throws Exception {
        Ctx actor = newUser("ADMIN");
        JsonNode created = create(actor);
        long id = created.get("id").asLong();
        int v = created.get("version").asInt();

        // Retire
        MvcResult retired = mockMvc.perform(post("/api/equipment/" + id + "/retire")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new EquipmentTransitionRequest(v, "end of life"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RETIRED"))
                .andReturn();
        v = version(retired);

        // Attempt calibration — should fail
        mockMvc.perform(post("/api/equipment/" + id + "/calibration-pass")
                        .session(actor.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CalibrationPassRequest(v, LocalDate.now(), null,
                                null, null, null, null))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void createWithoutPermissionIsForbidden() throws Exception {
        Ctx op = newUser("OPERATOR");
        mockMvc.perform(post("/api/equipment").session(op.session).contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateEquipmentRequest("HPLC", EquipmentType.HPLC,
                                "Waters", "Alliance", "SN-999", "Lab B", null, 6))))
                .andExpect(status().isForbidden());
    }

    // --- helpers ---------------------------------------------------------------------------

    private JsonNode create(Ctx ctx) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/equipment").session(ctx.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateEquipmentRequest("Test Balance", EquipmentType.BALANCE,
                                "Sartorius", "CPA224S", "SN-" + UUID.randomUUID().toString().substring(0, 6),
                                "QC Lab", null, 6))))
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
        user.setEmail("equip-" + suffix + "@test.io");
        user.setUsername("equip-" + suffix);
        user.setFullName("Equip User " + suffix);
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
