package com.eqms.signatures;

import com.eqms.shared.constants.SignatureMeaning;

/**
 * A request to apply an electronic signature (CLAUDE.md compliance rule 4).
 *
 * @param userId                   the signer
 * @param recordType               record being signed, e.g. "Document"
 * @param recordId                 business id of that record
 * @param contentHash              hash of the record's signable content (binds the signature to it)
 * @param meaning                  controlled signature meaning
 * @param meaningStatement         human-readable statement rendered on screen/PDF
 * @param password                 re-authentication password
 * @param firstSignatureInSession  if true, MFA is additionally required (full credentials)
 * @param totpCode                 TOTP code (required when {@code firstSignatureInSession})
 * @param ipAddress                request IP (nullable)
 * @param userAgent                request user agent (nullable)
 */
public record SignatureRequest(
        Long userId,
        String recordType,
        String recordId,
        String contentHash,
        SignatureMeaning meaning,
        String meaningStatement,
        String password,
        boolean firstSignatureInSession,
        String totpCode,
        String ipAddress,
        String userAgent
) {
    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private Long userId;
        private String recordType;
        private String recordId;
        private String contentHash;
        private SignatureMeaning meaning;
        private String meaningStatement;
        private String password;
        private boolean firstSignatureInSession;
        private String totpCode;
        private String ipAddress;
        private String userAgent;

        public Builder userId(Long v) { this.userId = v; return this; }
        public Builder recordType(String v) { this.recordType = v; return this; }
        public Builder recordId(String v) { this.recordId = v; return this; }
        public Builder contentHash(String v) { this.contentHash = v; return this; }
        public Builder meaning(SignatureMeaning v) { this.meaning = v; return this; }
        public Builder meaningStatement(String v) { this.meaningStatement = v; return this; }
        public Builder password(String v) { this.password = v; return this; }
        public Builder firstSignatureInSession(boolean v) { this.firstSignatureInSession = v; return this; }
        public Builder totpCode(String v) { this.totpCode = v; return this; }
        public Builder ipAddress(String v) { this.ipAddress = v; return this; }
        public Builder userAgent(String v) { this.userAgent = v; return this; }

        public SignatureRequest build() {
            return new SignatureRequest(userId, recordType, recordId, contentHash, meaning,
                    meaningStatement, password, firstSignatureInSession, totpCode, ipAddress, userAgent);
        }
    }
}
