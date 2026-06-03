package com.eqms.capa;

/** CAPA lifecycle states. Transitions are defined in {@link CapaWorkflow} (driven via WorkflowService). */
public enum CapaStatus {
    DRAFT,
    UNDER_INVESTIGATION,
    PENDING_APPROVAL,
    APPROVED,
    IN_PROGRESS,
    PENDING_EFFECTIVENESS_CHECK,
    CLOSED,
    REJECTED,
    CANCELLED
}
