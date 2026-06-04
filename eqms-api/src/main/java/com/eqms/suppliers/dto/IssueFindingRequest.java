package com.eqms.suppliers.dto;

import com.eqms.suppliers.FindingSeverity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record IssueFindingRequest(
        @NotBlank String findingDescription,
        @NotNull FindingSeverity severity,
        String rootCause,
        boolean correctiveActionRequired
) {
}
