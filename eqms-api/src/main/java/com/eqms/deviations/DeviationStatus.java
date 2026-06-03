package com.eqms.deviations;

/** Deviation lifecycle states. Transitions defined in {@link DeviationWorkflow} (via WorkflowService). */
public enum DeviationStatus {
    DRAFT,
    UNDER_INVESTIGATION,
    PENDING_APPROVAL,
    APPROVED,
    CLOSED,
    REJECTED,
    CANCELLED
}
