package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CloseAuditRequest(
        int expectedVersion,
        @NotBlank String closureComments,
        String reason
) {
}
