package com.eqms.workflows;

/**
 * Context for a single {@link WorkflowService#transition} call.
 *
 * @param action               action to perform (must match a transition from the current status)
 * @param expectedVersion      version the caller believes the record is at (optimistic check, rule 5)
 * @param actingUserId         the user performing the action
 * @param actingUserFullName   snapshot of that user's full name (for the audit entry)
 * @param reason               reason for change (captured in the audit entry)
 * @param ipAddress            request IP (nullable)
 * @param userAgent            request user agent (nullable)
 */
public record TransitionRequest(
        String action,
        int expectedVersion,
        Long actingUserId,
        String actingUserFullName,
        String reason,
        String ipAddress,
        String userAgent
) {
    public static Builder builder(String action) {
        return new Builder(action);
    }

    public static final class Builder {
        private final String action;
        private int expectedVersion;
        private Long actingUserId;
        private String actingUserFullName;
        private String reason;
        private String ipAddress;
        private String userAgent;

        private Builder(String action) {
            this.action = action;
        }

        public Builder expectedVersion(int v) { this.expectedVersion = v; return this; }
        public Builder actingUser(Long id, String fullName) {
            this.actingUserId = id;
            this.actingUserFullName = fullName;
            return this;
        }
        public Builder reason(String v) { this.reason = v; return this; }
        public Builder ipAddress(String v) { this.ipAddress = v; return this; }
        public Builder userAgent(String v) { this.userAgent = v; return this; }

        public TransitionRequest build() {
            return new TransitionRequest(action, expectedVersion, actingUserId, actingUserFullName,
                    reason, ipAddress, userAgent);
        }
    }
}
