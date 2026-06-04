package com.eqms.audits.dto;

import com.eqms.audits.FindingSeverity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecordFindingRequest(
        @NotBlank String description,
        String area,
        @NotNull FindingSeverity severity,
        String evidence,
        String rootCause,
        boolean correctiveActionRequired
) {
}
