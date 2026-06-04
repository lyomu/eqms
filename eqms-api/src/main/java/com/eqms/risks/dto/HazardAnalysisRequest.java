package com.eqms.risks.dto;

import com.eqms.risks.AnalysisMethod;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Submit the hazard analysis; the inherent risk score is computed as severity × probability. */
public record HazardAnalysisRequest(
        @NotNull Integer expectedVersion,
        @NotNull AnalysisMethod analysisMethod,
        @NotBlank String findings,
        String consequence,
        @NotNull @Min(1) @Max(5) Integer severity,
        @NotNull @Min(1) @Max(5) Integer probability,
        String reason
) {
}
