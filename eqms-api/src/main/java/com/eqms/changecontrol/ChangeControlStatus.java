package com.eqms.changecontrol;

/**
 * Change Control lifecycle states. Transitions are defined in {@link ChangeControlWorkflow} and
 * driven exclusively through the shared WorkflowService.
 */
public enum ChangeControlStatus {
    DRAFT,
    UNDER_REVIEW,
    CHANGES_REQUESTED,
    PENDING_APPROVAL,
    APPROVED,
    IN_IMPLEMENTATION,
    IMPLEMENTED,
    PENDING_CLOSURE,
    CLOSED,
    REJECTED,
    CANCELLED
}
