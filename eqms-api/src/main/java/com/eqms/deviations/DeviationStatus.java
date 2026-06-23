package com.eqms.deviations;

/** Deviation lifecycle states. Transitions defined in {@link DeviationWorkflow} (via WorkflowService). */
public enum DeviationStatus {
    DRAFT,
    REPORTED,
    UNDER_INVESTIGATION,
    INVESTIGATION_IN_PROGRESS,
    PENDING_APPROVAL,
    APPROVED,
    CLOSED,
    REJECTED,
    CANCELLED,
    REOPENED
}
