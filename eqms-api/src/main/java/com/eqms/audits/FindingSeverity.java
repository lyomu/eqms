package com.eqms.audits;

/** Severity of an audit finding. Critical findings require an immediate CAPA (business rule). */
public enum FindingSeverity {
    CRITICAL,
    MAJOR,
    MINOR
}
