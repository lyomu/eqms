package com.eqms.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** First leg of login: email + password. */
public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
) {
}
