package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Body for signed transitions (acknowledge, close): re-auth credentials + signature meaning. */
public record SignedTransitionRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
