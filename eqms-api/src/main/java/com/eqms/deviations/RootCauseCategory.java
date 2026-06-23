package com.eqms.deviations;

/** Root cause category taxonomy for deviation investigations. */
public enum RootCauseCategory {
    HUMAN_ERROR,
    PROCESS_FAILURE,
    EQUIPMENT_FAILURE,
    MATERIAL_ISSUE,
    SUPPLIER_ISSUE,
    METHOD_PROCEDURE_GAP,
    TRAINING_GAP,
    DOCUMENTATION_GAP,
    ENVIRONMENTAL_ISSUE,
    SYSTEM_SOFTWARE_ISSUE,
    DATA_INTEGRITY_ISSUE,
    UNKNOWN_INCONCLUSIVE,
    OTHER
}
