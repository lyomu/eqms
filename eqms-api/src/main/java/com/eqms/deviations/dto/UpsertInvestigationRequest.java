package com.eqms.deviations.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.deviations.InvestigationStatus;
import com.eqms.deviations.RootCauseCategory;

public record UpsertInvestigationRequest(
        InvestigationStatus status,
        Long investigationOwnerId,
        Instant startDate,
        LocalDate dueDate,
        Instant completionDate,
        String summary,
        String evidenceReviewed,
        RootCauseCategory rootCauseCategory,
        String rootCauseDescription,
        String contributingFactors,
        String mostProbableRootCause,
        Boolean rootCauseConfirmed,
        String analysisMethod,
        String investigationConclusion
) {
}
