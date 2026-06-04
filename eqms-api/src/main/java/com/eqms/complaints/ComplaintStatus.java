package com.eqms.complaints;

/** Complaint lifecycle states. Transitions are defined in {@link ComplaintWorkflow} (via WorkflowService). */
public enum ComplaintStatus {
    OPEN,
    ACKNOWLEDGED,
    UNDER_INVESTIGATION,
    RESOLVED,
    CLOSED,
    CANCELLED
}
