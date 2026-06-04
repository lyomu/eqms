package com.eqms.suppliers;

/** Supplier qualification lifecycle states. Transitions defined in {@link SupplierWorkflow}. */
public enum SupplierStatus {
    UNAPPROVED,
    QUALIFIED,
    CONDITIONAL
}
