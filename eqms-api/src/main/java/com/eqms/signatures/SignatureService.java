package com.eqms.signatures;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.audit.AuditEntryRequest;
import com.eqms.audit.AuditService;
import com.eqms.auth.mfa.TotpService;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;
import com.eqms.shared.constants.AuditAction;
import com.eqms.shared.constants.SignatureMeaning;

/**
 * Applies and verifies 21 CFR Part 11 electronic signatures (CLAUDE.md compliance rule 4).
 *
 * <ul>
 *   <li><b>Re-authentication</b>: the signer's password is always re-checked; for the first
 *       signature in a session, a fresh TOTP code is also required (full credentials).</li>
 *   <li><b>Controlled meaning</b>: only {@link SignatureMeaning} values (enforced in Java and by a
 *       DB CHECK constraint).</li>
 *   <li><b>Record binding</b>: an HMAC-SHA256 over {@code recordType|recordId|contentHash|meaning|
 *       userId|signedAt} ties the signature to a specific record's content. Changing the record's
 *       content changes its {@code contentHash}, so the stored HMAC no longer verifies — a signature
 *       cannot be transferred to (or survive tampering of) another record.</li>
 * </ul>
 */
@Service
public class SignatureService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final ElectronicSignatureRepository signatureRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TotpService totpService;
    private final AuditService auditService;
    private final Clock clock;

    @Value("${eqms.signature.hmac-key}")
    private String hmacKey;

    @Value("${eqms.signature.hmac-key-id}")
    private String hmacKeyId;

    public SignatureService(ElectronicSignatureRepository signatureRepository, UserRepository userRepository,
                            PasswordEncoder passwordEncoder, TotpService totpService,
                            AuditService auditService, Clock utcClock) {
        this.signatureRepository = signatureRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.totpService = totpService;
        this.auditService = auditService;
        this.clock = utcClock;
    }

    /** Apply a signature after re-authentication. Returns the persisted, immutable signature. */
    @Transactional
    public ElectronicSignature sign(SignatureRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new IllegalStateException("Signer not found: " + request.userId()));

        // Re-authentication (rule 4): password always; MFA for the first signature in a session.
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Re-authentication failed");
        }
        if (request.firstSignatureInSession()
                && (request.totpCode() == null || user.getMfaSecret() == null
                || !totpService.verify(user.getMfaSecret(), request.totpCode()))) {
            throw new BadCredentialsException("MFA is required for the first signature in a session");
        }

        Instant signedAt = Instant.now(clock).truncatedTo(ChronoUnit.MILLIS);
        String hmac = computeHmac(request.recordType(), request.recordId(), request.contentHash(),
                request.meaning(), user.getId(), signedAt);

        ElectronicSignature signature = ElectronicSignature.builder()
                .recordType(request.recordType())
                .recordId(request.recordId())
                .userId(user.getId())
                .signerFullName(user.getFullName())
                .signatureMeaning(request.meaning())
                .meaningStatement(request.meaningStatement())
                .signedAt(signedAt)
                .hmacSha256(hmac)
                .hmacKeyId(hmacKeyId)
                .ipAddress(request.ipAddress())
                .userAgent(request.userAgent())
                .build();
        signature = signatureRepository.save(signature);

        auditService.record(AuditEntryRequest.builder()
                .recordType(request.recordType()).recordId(request.recordId())
                .action(AuditAction.SIGN)
                .newValue(request.meaning().label())
                .reasonForChange("Electronic signature applied: " + request.meaning().label())
                .userId(user.getId()).userFullName(user.getFullName())
                .ipAddress(request.ipAddress()).userAgent(request.userAgent())
                .build());

        return signature;
    }

    /**
     * True if the record has a currently-valid signature with the given meaning by the given user.
     * "Valid" means the stored HMAC still matches the record's current content hash.
     */
    @Transactional(readOnly = true)
    public boolean hasValidSignature(String recordType, String recordId, String currentContentHash,
                                     SignatureMeaning meaning, Long userId) {
        for (ElectronicSignature signature :
                signatureRepository.findByRecordTypeAndRecordIdOrderBySignedAtDesc(recordType, recordId)) {
            if (signature.getSignatureMeaning() == meaning
                    && signature.getUserId().equals(userId)
                    && verify(signature, currentContentHash)) {
                return true;
            }
        }
        return false;
    }

    /** Verify a stored signature against the record's current content hash. */
    public boolean verify(ElectronicSignature signature, String currentContentHash) {
        String expected = computeHmac(signature.getRecordType(), signature.getRecordId(), currentContentHash,
                signature.getSignatureMeaning(), signature.getUserId(), signature.getSignedAt());
        return constantTimeEquals(expected, signature.getHmacSha256());
    }

    /** SHA-256 hex of a record's canonical content; modules use this to produce a content hash. */
    public static String sha256Hex(String content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private String computeHmac(String recordType, String recordId, String contentHash,
                               SignatureMeaning meaning, Long userId, Instant signedAt) {
        String payload = String.join("|",
                recordType,
                recordId,
                contentHash == null ? "" : contentHash,
                meaning.label(),
                String.valueOf(userId),
                String.valueOf(signedAt.toEpochMilli()));
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(hmacKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Unable to compute signature HMAC", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
