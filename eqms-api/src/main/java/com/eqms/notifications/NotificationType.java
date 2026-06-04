package com.eqms.notifications;

/**
 * Notification event categories. Only event types whose source module exists are wired today;
 * Training/Audit/Complaint types will be added with their milestones (M11/M12/M15).
 */
public enum NotificationType {
    DOCUMENT_SUBMITTED_FOR_REVIEW,
    DOCUMENT_PENDING_APPROVAL,
    CHANGE_SUBMITTED,
    CAPA_ASSIGNED,
    DEVIATION_ASSIGNED,
    TASK_OVERDUE,
    GENERAL
}
