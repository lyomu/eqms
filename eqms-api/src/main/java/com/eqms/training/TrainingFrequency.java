package com.eqms.training;

/** How often a training must be retaken. Drives the assignment due date. */
public enum TrainingFrequency {
    ON_HIRE(0),
    ANNUAL(365),
    BIENNIAL(730);

    private final int days;

    TrainingFrequency(int days) {
        this.days = days;
    }

    /** Default validity window in days (0 = one-off, no recurring due date offset). */
    public int days() {
        return days;
    }
}
