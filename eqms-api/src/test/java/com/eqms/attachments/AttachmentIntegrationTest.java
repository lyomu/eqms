package com.eqms.attachments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
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
import com.eqms.support.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@AutoConfigureMockMvc
class AttachmentIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;
    @Autowired UserRoleRepository userRoleRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired TotpService totpService;
    @Autowired ObjectMapper objectMapper;
    @Autowired AttachmentRepository attachmentRepository;

    @Test
    void uploadStoresMetadataAndComputesSha256() throws Exception {
        MockHttpSession session = login("ADMIN");
        byte[] content = "Calibration certificate PDF content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "cert.pdf",
                MediaType.APPLICATION_PDF_VALUE, content);

        MvcResult result = mockMvc.perform(multipart("/api/attachments/Equipment/42")
                        .file(file).session(session))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("cert.pdf"))
                .andExpect(jsonPath("$.sha256").isNotEmpty())
                .andExpect(jsonPath("$.sizeBytes").value(content.length))
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        long attachmentId = body.get("id").asLong();
        assertThat(attachmentRepository.findById(attachmentId)).isPresent();
    }

    @Test
    void listReturnsAttachmentsForRecord() throws Exception {
        MockHttpSession session = login("ADMIN");
        String recordId = UUID.randomUUID().toString();
        byte[] content = "SOP document".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "sop.pdf",
                MediaType.APPLICATION_PDF_VALUE, content);

        mockMvc.perform(multipart("/api/attachments/Document/" + recordId)
                        .file(file).session(session))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/attachments/Document/" + recordId).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fileName").value("sop.pdf"))
                .andExpect(jsonPath("$[0].recordType").value("Document"))
                .andExpect(jsonPath("$[0].recordId").value(recordId));
    }

    @Test
    void downloadStreamsFileBytes() throws Exception {
        MockHttpSession session = login("ADMIN");
        byte[] content = "Certificate binary content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "calib.pdf",
                MediaType.APPLICATION_PDF_VALUE, content);

        MvcResult uploaded = mockMvc.perform(multipart("/api/attachments/Calibration/99")
                        .file(file).session(session))
                .andExpect(status().isCreated()).andReturn();

        long id = objectMapper.readTree(uploaded.getResponse().getContentAsString()).get("id").asLong();

        MvcResult download = mockMvc.perform(get("/api/attachments/" + id + "/download")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"calib.pdf\""))
                .andReturn();

        assertThat(download.getResponse().getContentAsByteArray()).isEqualTo(content);
    }

    @Test
    void unauthenticatedUploadIsForbidden() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "x.pdf",
                MediaType.APPLICATION_PDF_VALUE, "x".getBytes());
        mockMvc.perform(multipart("/api/attachments/Document/1").file(file))
                .andExpect(status().isUnauthorized());
    }

    // --- helpers ---------------------------------------------------------------------------

    private MockHttpSession login(String roleName) throws Exception {
        String secret = totpService.generateSecret();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("att-" + suffix + "@test.io");
        user.setUsername("att-" + suffix);
        user.setFullName("Att User " + suffix);
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

        MvcResult login = mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                .post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(new LoginRequest(user.getEmail(), PASSWORD))))
                .andExpect(status().isOk()).andReturn();

        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        String code = totpService.generateCode(secret, totpService.currentTimeStep());
        mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/auth/mfa/verify").session(session).contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MfaVerifyRequest(code))))
                .andExpect(status().isOk());
        return session;
    }
}
