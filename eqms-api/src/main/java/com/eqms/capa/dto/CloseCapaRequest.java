package com.eqms.capa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** CAPA closure body: like approval, plus the effectiveness-check result captured at closure. */
public record CloseCapaRequest(
        @NotNull Integer expectedVersion,
        String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement,
        String effectivenessResult
) {
}
