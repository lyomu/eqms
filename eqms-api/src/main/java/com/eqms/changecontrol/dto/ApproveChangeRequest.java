package com.eqms.changecontrol.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Approval body: optimistic version, reason, re-auth password, TOTP (first signature), meaning. */
public record ApproveChangeRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
