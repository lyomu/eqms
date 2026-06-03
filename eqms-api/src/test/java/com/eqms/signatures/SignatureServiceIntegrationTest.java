package com.eqms.signatures;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.eqms.auth.mfa.TotpService;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.support.AbstractIntegrationTest;

/**
 * Proves the Part 11 signature rules (rule 4): a signature binds to the record content via
 * HMAC-SHA256 so tampering invalidates it, the password is re-checked, and the first signature in a
 * session additionally requires MFA.
 */
class SignatureServiceIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Password123!";
    private static final String RECORD_TYPE = "Document";

    @Autowired
    SignatureService signatureService;
    @Autowired
    UserRepository userRepository;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    TotpService totpService;

    @Test
    void signatureVerifiesForOriginalContentButNotAfterTampering() {
        User user = createUser(null);
        String recordId = "DOC-" + UUID.randomUUID();
        String originalHash = SignatureService.sha256Hex("SOP body, version 1");

        signatureService.sign(SignatureRequest.builder()
                .userId(user.getId())
                .recordType(RECORD_TYPE).recordId(recordId)
                .contentHash(originalHash)
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement("Approved for release")
                .password(PASSWORD)
                .firstSignatureInSession(false)
                .build());

        // Valid against the content that was signed.
        assertThat(signatureService.hasValidSignature(
                RECORD_TYPE, recordId, originalHash, SignatureMeaning.APPROVED, user.getId())).isTrue();

        // Tampered content -> different hash -> signature no longer verifies.
        String tamperedHash = SignatureService.sha256Hex("SOP body, version 1 (secretly edited)");
        assertThat(signatureService.hasValidSignature(
                RECORD_TYPE, recordId, tamperedHash, SignatureMeaning.APPROVED, user.getId())).isFalse();
    }

    @Test
    void wrongPasswordIsRejected() {
        User user = createUser(null);
        assertThatThrownBy(() -> signatureService.sign(SignatureRequest.builder()
                .userId(user.getId())
                .recordType(RECORD_TYPE).recordId("DOC-" + UUID.randomUUID())
                .contentHash(SignatureService.sha256Hex("x"))
                .meaning(SignatureMeaning.REVIEWED)
                .meaningStatement("Reviewed")
                .password("wrong-password")
                .firstSignatureInSession(false)
                .build()))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void firstSignatureInSessionRequiresValidMfa() {
        String secret = totpService.generateSecret();
        User user = createUser(secret);
        String recordId = "DOC-" + UUID.randomUUID();

        // Missing/invalid TOTP -> rejected.
        assertThatThrownBy(() -> signatureService.sign(baseRequest(user.getId(), recordId)
                .firstSignatureInSession(true)
                .totpCode(null)
                .build()))
                .isInstanceOf(BadCredentialsException.class);

        // Valid TOTP -> accepted.
        String code = totpService.generateCode(secret, totpService.currentTimeStep());
        signatureService.sign(baseRequest(user.getId(), recordId)
                .firstSignatureInSession(true)
                .totpCode(code)
                .build());

        assertThat(signatureService.hasValidSignature(RECORD_TYPE, recordId,
                baseHash(), SignatureMeaning.APPROVED, user.getId())).isTrue();
    }

    private SignatureRequest.Builder baseRequest(Long userId, String recordId) {
        return SignatureRequest.builder()
                .userId(userId)
                .recordType(RECORD_TYPE).recordId(recordId)
                .contentHash(baseHash())
                .meaning(SignatureMeaning.APPROVED)
                .meaningStatement("Approved for release")
                .password(PASSWORD);
    }

    private static String baseHash() {
        return SignatureService.sha256Hex("canonical content");
    }

    private User createUser(String mfaSecret) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = new User();
        user.setEmail("sig-" + suffix + "@test.io");
        user.setUsername("sig-" + suffix);
        user.setFullName("Signer " + suffix);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setMfaSecret(mfaSecret);
        user.setMfaEnabled(mfaSecret != null);
        user.setStatus(User.UserStatus.ACTIVE);
        return userRepository.save(user);
    }
}
