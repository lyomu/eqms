package com.eqms.audits.dto;

public record UpdateFindingRequest(
        String title,
        String description,
        String findingType,
        String severity,
        String riskLevel,
        String requirementReference,
        String evidence,
        String rootCause,
        Boolean correctiveActionRequired,
        Boolean immediateCorrectionRequired,
        Boolean rootCauseRequired,
        Boolean capaRequired,
        Long responsibleOwnerId,
        String dueDate,
        String findingStatus,
        String area,
        String reason
) {
}
