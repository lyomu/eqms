package com.eqms.oosmanagement.dto;

import com.eqms.oosmanagement.OosDispositionDecision;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DetermineDispositionRequest(
        @NotNull Integer expectedVersion,
        @NotNull OosDispositionDecision disposition,
        @NotBlank String rationale,
        @NotBlank String password,
        String totpCode,
        String meaningStatement,
        String reason
) {
}
