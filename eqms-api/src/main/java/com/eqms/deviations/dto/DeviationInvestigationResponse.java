package com.eqms.deviations.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.deviations.DeviationInvestigation;

public record DeviationInvestigationResponse(
        Long id,
        Long deviationId,
        int version,
        String status,
        Long investigationOwnerId,
        Instant startDate,
        LocalDate dueDate,
        Instant completionDate,
        String summary,
        String evidenceReviewed,
        String rootCauseCategory,
        String rootCauseDescription,
        String contributingFactors,
        String mostProbableRootCause,
        boolean rootCauseConfirmed,
        String analysisMethod,
        String investigationConclusion,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static DeviationInvestigationResponse from(DeviationInvestigation i) {
        return new DeviationInvestigationResponse(
                i.getId(),
                i.getDeviationId(),
                i.getVersion(),
                i.getStatus() == null ? null : i.getStatus().name(),
                i.getInvestigationOwnerId(),
                i.getStartDate(),
                i.getDueDate(),
                i.getCompletionDate(),
                i.getSummary(),
                i.getEvidenceReviewed(),
                i.getRootCauseCategory() == null ? null : i.getRootCauseCategory().name(),
                i.getRootCauseDescription(),
                i.getContributingFactors(),
                i.getMostProbableRootCause(),
                i.isRootCauseConfirmed(),
                i.getAnalysisMethod(),
                i.getInvestigationConclusion(),
                i.getCreatedBy(),
                i.getCreatedAt(),
                i.getUpdatedAt());
    }
}
