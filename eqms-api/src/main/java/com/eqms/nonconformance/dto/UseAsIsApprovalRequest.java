package com.eqms.nonconformance.dto;

import jakarta.validation.constraints.NotBlank;

public record UseAsIsApprovalRequest(
        @NotBlank String useAsIsJustification,
        String riskAssessment,
        @NotBlank String password,
        String totpCode,
        String meaningStatement,
        String reason
) {
}
