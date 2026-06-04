package com.eqms.complaints.dto;

import com.eqms.complaints.ComplaintSeverity;

import jakarta.validation.constraints.NotNull;

public record UpdateComplaintRequest(
        @NotNull Integer expectedVersion,
        String complaintDescription,
        ComplaintSeverity severity,
        String reportedBy,
        String reason
) {
}
