package com.eqms.risks.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Management acceptance of a risk, with a sign-off signature (re-auth credentials). */
public record AcceptRiskRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
