package com.eqms.products;

/** Product master-data lifecycle states. Transitions defined in {@link ProductWorkflow}. */
public enum ProductStatus {
    DRAFT,
    PENDING_APPROVAL,
    ACTIVE,
    ON_HOLD,
    DISCONTINUED,
    REJECTED
}
