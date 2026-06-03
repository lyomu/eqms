package com.eqms.documents;

/**
 * Document types and their record-number prefix (e.g. {@code SOP-2026-001}). The prefix also keys
 * the per-type, per-year sequence in {@code record_sequences} (compliance rule 6).
 */
public enum DocumentType {
    SOP("SOP"),
    WORK_INSTRUCTION("WI"),
    POLICY("POL"),
    FORM("FORM"),
    SPECIFICATION("SPEC"),
    OTHER("DOC");

    private final String prefix;

    DocumentType(String prefix) {
        this.prefix = prefix;
    }

    public String prefix() {
        return prefix;
    }
}
