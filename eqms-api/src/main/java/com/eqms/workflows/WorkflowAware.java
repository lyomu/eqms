package com.eqms.workflows;

/**
 * Implemented by every regulated record whose status is driven through the shared
 * {@link WorkflowService}. Modules map their own status enum to/from the {@code String} used here.
 *
 * <p>CLAUDE.md architecture principle: no module mutates status directly — all transitions go
 * through {@code WorkflowService}, which reads/writes status via this interface.</p>
 */
public interface WorkflowAware {

    Long getId();

    /** Logical record type for audit/signature lookups, e.g. "Document". */
    String getRecordType();

    /** Current status (a state name from the module's {@link WorkflowDefinition}). */
    String getStatus();

    void setStatus(String status);

    /** Optimistic-lock counter (compliance rule 5). */
    int getVersion();

    /** User who created/authored the record — used to forbid self-approval (rule 7). */
    Long getCreatedBy();

    /** User who submitted the record into the workflow (nullable) — also forbidden from approving. */
    default Long getSubmittedBy() {
        return null;
    }

    /**
     * Canonical hash of the record's signable content, used to verify that an electronic signature
     * still binds to the current content (rule 4). Returning {@code null} skips the content check.
     */
    default String workflowContentHash() {
        return null;
    }
}
