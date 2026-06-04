package com.eqms.training.dto;

/** Training compliance snapshot: counts of assignments by status across the system. */
public record ComplianceStatusResponse(
        long assigned,
        long inProgress,
        long completed,
        long overdue,
        double completionRatePct
) {
}
