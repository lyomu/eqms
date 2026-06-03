package com.eqms.deviations.dto;

import java.time.Instant;

import com.eqms.deviations.Deviation;

public record DeviationResponse(
        Long id,
        String deviationNumber,
        String title,
        String severity,
        String status,
        int version,
        String description,
        String rootCause,
        String immediateAction,
        Instant occurredDate,
        Instant closedDate,
        Long createdBy,
        Long submittedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static DeviationResponse from(Deviation d) {
        return new DeviationResponse(
                d.getId(),
                d.getDeviationNumber(),
                d.getTitle(),
                d.getSeverity().name(),
                d.getDeviationStatus().name(),
                d.getVersion(),
                d.getDescription(),
                d.getRootCause(),
                d.getImmediateAction(),
                d.getOccurredDate(),
                d.getClosedDate(),
                d.getCreatedBy(),
                d.getSubmittedBy(),
                d.getCreatedAt(),
                d.getUpdatedAt());
    }
}
