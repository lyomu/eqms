package com.eqms.deviations.dto;

import java.time.Instant;

import com.eqms.deviations.DeviationSeverity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDeviationRequest(
        @NotBlank String title,
        @NotNull DeviationSeverity severity,
        @NotBlank String description,
        String immediateAction,
        Instant occurredDate
) {
}
