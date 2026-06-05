package com.eqms.managementreview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ApproveReviewRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
