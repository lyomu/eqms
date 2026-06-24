package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateFindingRequest(
        String title,
        @NotBlank String description,
        @NotBlank String findingType,
        String area,
        @NotBlank String severity,
        String riskLevel,
        String requirementReference,
        String evidence,
        String rootCause,
        Boolean correctiveActionRequired,
        Boolean immediateCorrectionRequired,
        Boolean rootCauseRequired,
        Boolean capaRequired,
        Long responsibleOwnerId,
        String dueDate
) {
}
