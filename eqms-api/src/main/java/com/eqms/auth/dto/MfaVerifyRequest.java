package com.eqms.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Second leg of login: the 6-digit TOTP code. */
public record MfaVerifyRequest(
        @NotBlank String code
) {
}
