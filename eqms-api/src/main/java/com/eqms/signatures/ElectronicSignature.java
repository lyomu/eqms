package com.eqms.signatures;

import java.time.Instant;

import org.hibernate.annotations.Immutable;

import com.eqms.shared.constants.SignatureMeaning;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

/**
 * An applied electronic signature (CLAUDE.md compliance rule 4, 21 CFR Part 11).
 *
 * <p>Immutable once written. The {@code hmac_sha256} column binds the signature to the
 * signed record's content + metadata so a signature cannot be transferred to another
 * record; the signing ceremony that computes it (re-auth, HMAC) is implemented in
 * Milestone 2. Stored here so the table exists and the schema is complete in Milestone 0.</p>
 *
 * <p>The {@code signature_meaning} is constrained to the controlled vocabulary both in Java
 * ({@link SignatureMeaning}) and via a DB CHECK constraint.</p>
 */
@Entity
@Table(name = "electronic_signatures")
@Immutable
@Getter
public class ElectronicSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "record_type", nullable = false, length = 80, updatable = false)
    private String recordType;

    @Column(name = "record_id", nullable = false, length = 80, updatable = false)
    private String recordId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "signer_full_name", nullable = false, length = 200, updatable = false)
    private String signerFullName;

    @Convert(converter = SignatureMeaningConverter.class)
    @Column(name = "signature_meaning", nullable = false, length = 20, updatable = false)
    private SignatureMeaning signatureMeaning;

    /** Human-readable statement rendered on screen and PDF (rule 4). */
    @Column(name = "meaning_statement", nullable = false, columnDefinition = "text", updatable = false)
    private String meaningStatement;

    /** Server-side UTC signing time (rule 3). */
    @Column(name = "signed_at", nullable = false, updatable = false)
    private Instant signedAt;

    /** HMAC-SHA256 binding signature → record content + metadata. Populated in Milestone 2. */
    @Column(name = "hmac_sha256", nullable = false, length = 64, updatable = false)
    private String hmacSha256;

    /** Identifies which HMAC key version produced the binding (supports key rotation). */
    @Column(name = "hmac_key_id", nullable = false, length = 40, updatable = false)
    private String hmacKeyId;

    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "text", updatable = false)
    private String userAgent;

    protected ElectronicSignature() {
        // for JPA
    }
}
