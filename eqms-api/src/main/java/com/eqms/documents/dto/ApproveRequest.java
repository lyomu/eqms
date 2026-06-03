package com.eqms.documents.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Approval body. Includes the re-authentication password (always) and a TOTP code (required for the
 * first signature in the session); {@code meaningStatement} is the human-readable signature text.
 */
public record ApproveRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
