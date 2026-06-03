package com.eqms.changecontrol;

/**
 * Risk-based change classification. Major changes may affect product safety/quality/efficacy and
 * require approval before implementation; minor changes do not impact the product's intended use.
 */
public enum ChangeType {
    MAJOR,
    MINOR
}
