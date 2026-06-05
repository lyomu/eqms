package com.eqms.notifications;

public enum NotificationType {
    // Document / change workflows
    DOCUMENT_SUBMITTED_FOR_REVIEW,
    DOCUMENT_PENDING_APPROVAL,
    CHANGE_SUBMITTED,

    // Investigation / corrective
    CAPA_ASSIGNED,
    DEVIATION_ASSIGNED,

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
