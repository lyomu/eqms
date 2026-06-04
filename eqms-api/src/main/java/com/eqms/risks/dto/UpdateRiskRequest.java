package com.eqms.risks.dto;

import com.eqms.risks.RiskCategory;

import jakarta.validation.constraints.NotNull;

public record UpdateRiskRequest(
        @NotNull Integer expectedVersion,
        String title,
        String description,
        String potentialImpact,
        RiskCategory category,
        String reason
) {
}
