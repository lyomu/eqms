package com.eqms.notifications;

public enum NotificationType {
    // Document / change workflows
    DOCUMENT_SUBMITTED_FOR_REVIEW,
    DOCUMENT_PENDING_APPROVAL,
    DOCUMENT_APPROVED,
    DOCUMENT_REJECTED,
    DOCUMENT_READ_ASSIGNED,
    CHANGE_SUBMITTED,
    CHANGE_PENDING_APPROVAL,

    // Investigation / corrective
    CAPA_ASSIGNED,
    CAPA_SUBMITTED_FOR_APPROVAL,
    DEVIATION_ASSIGNED,

    // Complaint / audit / supplier
    COMPLAINT_LOGGED,
    AUDIT_SCHEDULED,
    SUPPLIER_AUDIT_SCHEDULED,

    // Training
    TRAINING_ASSIGNED,

    // Quality events
    NONCONFORMANCE_OPENED,
    OOS_OPENED,

    // Scheduled reminders
    CALIBRATION_DUE,
    TRAINING_OVERDUE,
    OOS_STALE,
    NC_STALE,
    MANAGEMENT_REVIEW_OVERDUE,

    // Generic
    TASK_OVERDUE,
    GENERAL
}
