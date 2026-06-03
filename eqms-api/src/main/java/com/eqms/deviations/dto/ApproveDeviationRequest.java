package com.eqms.deviations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Deviation approval body: version, reason, re-auth password, TOTP (first signature), meaning. */
public record ApproveDeviationRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
