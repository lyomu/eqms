package com.eqms.retention.dto;

import jakarta.validation.constraints.NotBlank;

public record LegalHoldRequest(
        @NotBlank String recordType,
        @NotBlank String recordId,
        @NotBlank String reason
) {
}
