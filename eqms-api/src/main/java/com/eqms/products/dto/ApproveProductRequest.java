package com.eqms.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Product approval (activation) body: version, reason, re-auth password, TOTP, meaning. */
public record ApproveProductRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
