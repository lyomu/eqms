package com.eqms.shared.constants;

/**
 * Controlled vocabulary for electronic-signature meanings (CLAUDE.md compliance rule 4,
 * 21 CFR Part 11). This is the ONLY permitted set of signature meanings. The database
 * enforces the same set via a CHECK constraint on {@code electronic_signatures.signature_meaning};
 * the two must be kept in sync.
 */
public enum SignatureMeaning {
    AUTHORED("Authored"),
    REVIEWED("Reviewed"),
    APPROVED("Approved"),
    RELEASED("Released"),
    REJECTED("Rejected"),
    ACKNOWLEDGED("Acknowledged");

    /** The exact stored/rendered label. Must match the DB CHECK constraint value. */
    private final String label;

    SignatureMeaning(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /**
     * Resolve a stored label back to the enum, rejecting anything outside the vocabulary.
     *
     * @throws IllegalArgumentException if the label is not a permitted signature meaning
     */
    public static SignatureMeaning fromLabel(String label) {
        for (SignatureMeaning m : values()) {
            if (m.label.equals(label)) {
                return m;
            }
        }
        throw new IllegalArgumentException("Not a permitted signature meaning: " + label);
    }
}
