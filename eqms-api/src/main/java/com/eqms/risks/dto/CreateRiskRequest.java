package com.eqms.risks.dto;

import com.eqms.risks.RiskCategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRiskRequest(
        @NotBlank String title,
        @NotNull RiskCategory category,
        @NotBlank String description,
        @NotBlank String potentialImpact
) {
}
