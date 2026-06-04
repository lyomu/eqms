package com.eqms.materials;

/** Material master-data lifecycle states. Transitions defined in {@link MaterialWorkflow}. */
public enum MaterialStatus {
    DRAFT,
    PENDING_APPROVAL,
    APPROVED,
    ON_HOLD,
    OBSOLETE,
    REJECTED
}
