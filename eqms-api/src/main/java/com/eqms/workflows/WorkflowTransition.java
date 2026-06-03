package com.eqms.workflows;

import java.util.function.Predicate;

import com.eqms.shared.constants.SignatureMeaning;

/**
 * A single allowed status transition and the requirements that must be satisfied to perform it.
 * Built declaratively in each module's {@link WorkflowDefinition}.
 *
 * @param action               action name, e.g. "SUBMIT_FOR_REVIEW", "APPROVE"
 * @param fromStatus           status the record must currently be in
 * @param toStatus             status the record moves to
 * @param requiredAuthority    permission/role authority the actor must hold (nullable = any authenticated)
 * @param approval             if true, the actor must NOT be the record's author/submitter (rule 7)
 * @param requiresAttachment   if true, the record must have at least one attachment
 * @param requiredSignature    signature meaning that must already be applied + valid (nullable = none)
 * @param precondition         module-defined required-field check (nullable); returns true when satisfied
 * @param preconditionMessage  error message used when {@code precondition} fails (nullable)
 */
public record WorkflowTransition(
        String action,
        String fromStatus,
        String toStatus,
        String requiredAuthority,
        boolean approval,
        boolean requiresAttachment,
        SignatureMeaning requiredSignature,
        Predicate<WorkflowAware> precondition,
        String preconditionMessage
) {
    public static Builder builder(String action, String fromStatus, String toStatus) {
        return new Builder(action, fromStatus, toStatus);
    }

    public static final class Builder {
        private final String action;
        private final String fromStatus;
        private final String toStatus;
        private String requiredAuthority;
        private boolean approval;
        private boolean requiresAttachment;
        private SignatureMeaning requiredSignature;
        private Predicate<WorkflowAware> precondition;
        private String preconditionMessage;

        private Builder(String action, String fromStatus, String toStatus) {
            this.action = action;
            this.fromStatus = fromStatus;
            this.toStatus = toStatus;
        }

        public Builder requiredAuthority(String v) { this.requiredAuthority = v; return this; }
        public Builder approval(boolean v) { this.approval = v; return this; }
        public Builder requiresAttachment(boolean v) { this.requiresAttachment = v; return this; }
        public Builder requiredSignature(SignatureMeaning v) { this.requiredSignature = v; return this; }

        public Builder precondition(Predicate<WorkflowAware> check, String message) {
            this.precondition = check;
            this.preconditionMessage = message;
            return this;
        }

        public WorkflowTransition build() {
            return new WorkflowTransition(action, fromStatus, toStatus, requiredAuthority, approval,
                    requiresAttachment, requiredSignature, precondition, preconditionMessage);
        }
    }
}
