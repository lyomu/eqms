package com.eqms.deviations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Record/update the deviation's root-cause analysis (version-checked, audited field edit). */
public record UpdateDeviationRootCauseRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String rootCause,
        String reason
) {
}
