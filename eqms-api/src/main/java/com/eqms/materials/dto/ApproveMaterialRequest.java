package com.eqms.materials.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Material approval body: version, reason, re-auth password, TOTP, meaning. */
public record ApproveMaterialRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
