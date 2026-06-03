package com.eqms.documents;

/**
 * Document Control lifecycle states. Transitions between them are defined in
 * {@link DocumentWorkflow} and driven exclusively through the shared WorkflowService.
 */
public enum DocumentStatus {
    DRAFT,
    UNDER_REVIEW,
    CHANGES_REQUESTED,
    PENDING_APPROVAL,
    APPROVED,
    EFFECTIVE,
    SUPERSEDED,
    OBSOLETE,
    ARCHIVED
}
