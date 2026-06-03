package com.eqms.audit;

import com.eqms.shared.constants.AuditAction;

/**
 * Immutable description of a regulated action to be recorded in the audit trail.
 *
 * <p>Deliberately contains <b>no timestamp</b>: the server stamps UTC time when the entry is
 * written (CLAUDE.md rule 3). Callers describe <em>what</em> happened and <em>who</em> did it;
 * {@code AuditService} owns <em>when</em>.</p>
 *
 * @param recordType      logical record type (e.g. "Document")
 * @param recordId        business id of the affected record
 * @param action          the regulated action
 * @param fieldName       changed field for field-level edits; null for record-level actions
 * @param oldValue        previous value (null for creates)
 * @param newValue        new value
 * @param reasonForChange reason captured from the user (required by many workflows)
 * @param userId          acting user id
 * @param userFullName    acting user's full name, snapshotted into the entry
 * @param ipAddress       request IP (nullable)
 * @param userAgent       request user agent (nullable)
 */
public record AuditEntryRequest(
        String recordType,
        String recordId,
        AuditAction action,
        String fieldName,
        String oldValue,
        String newValue,
        String reasonForChange,
        Long userId,
        String userFullName,
        String ipAddress,
        String userAgent
) {
    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String recordType;
        private String recordId;
        private AuditAction action;
        private String fieldName;
        private String oldValue;
        private String newValue;
        private String reasonForChange;
        private Long userId;
        private String userFullName;
        private String ipAddress;
        private String userAgent;

        public Builder recordType(String v) { this.recordType = v; return this; }
        public Builder recordId(String v) { this.recordId = v; return this; }
        public Builder action(AuditAction v) { this.action = v; return this; }
        public Builder fieldName(String v) { this.fieldName = v; return this; }
        public Builder oldValue(String v) { this.oldValue = v; return this; }
        public Builder newValue(String v) { this.newValue = v; return this; }
        public Builder reasonForChange(String v) { this.reasonForChange = v; return this; }
        public Builder userId(Long v) { this.userId = v; return this; }
        public Builder userFullName(String v) { this.userFullName = v; return this; }
        public Builder ipAddress(String v) { this.ipAddress = v; return this; }
        public Builder userAgent(String v) { this.userAgent = v; return this; }

        public AuditEntryRequest build() {
            return new AuditEntryRequest(recordType, recordId, action, fieldName, oldValue,
                    newValue, reasonForChange, userId, userFullName, ipAddress, userAgent);
        }
    }
}
