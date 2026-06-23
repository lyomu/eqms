package com.eqms.deviations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReopenDeviationRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String reason
) {
}
