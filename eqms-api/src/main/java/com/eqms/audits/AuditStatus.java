package com.eqms.audits;

/** Quality-audit lifecycle states. Transitions are defined in {@link AuditWorkflow} (via WorkflowService). */
public enum AuditStatus {
    PLANNED,
    IN_PROGRESS,
    COMPLETED,
    FOLLOW_UP,
    CANCELLED
}
