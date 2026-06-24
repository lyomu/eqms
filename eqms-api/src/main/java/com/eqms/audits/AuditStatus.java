package com.eqms.audits;

/** Quality-audit lifecycle states. Transitions are defined in {@link AuditWorkflow} (via WorkflowService). */
public enum AuditStatus {
    DRAFT,
    PLANNED,
    SCHEDULED,
    IN_PROGRESS,
    FINDINGS_REVIEW,
    REPORT_DRAFT,
    REPORT_SUBMITTED,
    REPORT_APPROVED,
    ACTION_PLAN_PENDING,
    FOLLOW_UP_IN_PROGRESS,
    PENDING_CLOSURE,
    CLOSED,
    REOPENED,
    COMPLETED,
    FOLLOW_UP,
    CANCELLED,
    ARCHIVED
}
