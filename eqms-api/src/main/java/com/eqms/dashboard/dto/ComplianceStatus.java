package com.eqms.dashboard.dto;

/** High-level compliance posture for the dashboard. */
public record ComplianceStatus(
        long documentsDueForReview,
        long overdueCapas,
        long overdueChangeControls,
        long openDeviations,
        long quarantinedBatches
) {
}
