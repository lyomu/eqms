package com.eqms.capa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** CAPA approval body: version, reason, re-auth password, TOTP (first signature), meaning. */
public record ApproveCapaRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
