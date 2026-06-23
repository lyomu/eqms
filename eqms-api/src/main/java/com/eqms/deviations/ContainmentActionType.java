package com.eqms.deviations;

/** Type of immediate containment/correction action for a deviation. */
public enum ContainmentActionType {
    CONTAINMENT,
    CORRECTION,
    PRODUCT_HOLD,
    EQUIPMENT_HOLD,
    PROCESS_STOP,
    SEGREGATION,
    QUARANTINE,
    NOTIFICATION,
    OTHER
}
