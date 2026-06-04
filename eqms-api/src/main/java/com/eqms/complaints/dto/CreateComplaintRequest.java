package com.eqms.complaints.dto;

import com.eqms.complaints.ComplaintSeverity;
import com.eqms.complaints.ComplaintSource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateComplaintRequest(
        @NotNull Long productId,
        @NotBlank String complaintDescription,
        @NotNull ComplaintSource source,
        @NotNull ComplaintSeverity severity,
        String reportedBy
) {
}
