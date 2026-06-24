package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record ReopenAuditRequest(
        int expectedVersion,
        @NotBlank String reason
) {
}
