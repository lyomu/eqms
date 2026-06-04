package com.eqms.risks.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Record an effectiveness verification: the residual score and whether it is acceptable. */
public record VerifyEffectivenessRequest(
        @NotNull @Min(1) @Max(25) Integer residualRiskScore,
        @NotNull Boolean residualRiskAcceptable,
        String evidence,
        String reason
) {
}
