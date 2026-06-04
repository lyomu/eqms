package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Submit investigation findings and move the complaint to UNDER_INVESTIGATION. */
public record InvestigateRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String investigationFindings,
        String reason
) {
}
