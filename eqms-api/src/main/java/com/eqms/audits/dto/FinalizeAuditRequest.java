package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Finalize (complete) an audit with a sign-off signature (re-auth credentials). */
public record FinalizeAuditRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
