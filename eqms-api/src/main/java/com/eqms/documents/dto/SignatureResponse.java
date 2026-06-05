package com.eqms.documents.dto;

import java.time.Instant;

import com.eqms.signatures.ElectronicSignature;

/**
 * Read-only view of an applied electronic signature for the Approvals tab. Exposes the signer,
 * the controlled-vocabulary meaning, the human-readable statement, and the server UTC time —
 * never the HMAC binding itself.
 */
public record SignatureResponse(
        Long id,
        Long userId,
        String signerFullName,
        String meaning,
        String meaningStatement,
        Instant signedAt
) {
    public static SignatureResponse from(ElectronicSignature s) {
        return new SignatureResponse(
                s.getId(),
                s.getUserId(),
                s.getSignerFullName(),
                s.getSignatureMeaning().label(),
                s.getMeaningStatement(),
                s.getSignedAt());
    }
}
