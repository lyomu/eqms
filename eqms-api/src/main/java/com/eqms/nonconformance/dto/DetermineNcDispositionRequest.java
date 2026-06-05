package com.eqms.nonconformance.dto;

import com.eqms.nonconformance.NcDisposition;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DetermineNcDispositionRequest(
        @NotNull Integer expectedVersion,
        @NotNull NcDisposition disposition,
        @NotBlank String rationale,
        String reworkSpecifications,
        @NotBlank String password,
        String totpCode,
        String meaningStatement,
        String reason
) {
}
