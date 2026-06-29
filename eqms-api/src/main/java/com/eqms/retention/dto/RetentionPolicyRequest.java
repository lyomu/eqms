package com.eqms.retention.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RetentionPolicyRequest(
        @NotBlank String recordType,
        @Min(1) int retentionYears,
        String dispositionMethod,
        String legalBasis,
        Boolean active
) {
}
