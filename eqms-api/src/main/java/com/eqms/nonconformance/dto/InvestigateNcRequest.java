package com.eqms.nonconformance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InvestigateNcRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String investigationFindings,
        String rootCause,
        String reason
) {
}
