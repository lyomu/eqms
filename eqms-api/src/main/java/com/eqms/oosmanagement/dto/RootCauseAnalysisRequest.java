package com.eqms.oosmanagement.dto;

import jakarta.validation.constraints.NotBlank;

public record RootCauseAnalysisRequest(
        @NotBlank String investigationFindings,
        String rootCause,
        String rootCauseMethod,
        String reason
) {
}
