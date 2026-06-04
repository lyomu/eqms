package com.eqms.risks;

/** Risk lifecycle states (ISO 31000 / ICH Q9). Transitions defined in {@link RiskWorkflow}. */
public enum RiskStatus {
    IDENTIFIED,
    ANALYZED,
    MITIGATED,
    ACCEPTED,
    CLOSED,
    CANCELLED
}
