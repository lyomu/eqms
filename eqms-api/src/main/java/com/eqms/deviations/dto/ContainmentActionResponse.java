package com.eqms.deviations.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.deviations.ContainmentAction;

public record ContainmentActionResponse(
        Long id,
        Long deviationId,
        String description,
        String actionType,
        Long ownerId,
        LocalDate dueDate,
        String status,
        String completionEvidence,
        Instant completionDate,
        Long verifiedById,
        Instant verificationDate,
        String comments,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt,
        int version
) {
    public static ContainmentActionResponse from(ContainmentAction a) {
        return new ContainmentActionResponse(
                a.getId(),
                a.getDeviationId(),
                a.getDescription(),
                a.getActionType().name(),
                a.getOwnerId(),
                a.getDueDate(),
                a.getStatus().name(),
                a.getCompletionEvidence(),
                a.getCompletionDate(),
                a.getVerifiedById(),
                a.getVerificationDate(),
                a.getComments(),
                a.getCreatedBy(),
                a.getCreatedAt(),
                a.getUpdatedAt(),
                a.getVersion());
    }
}
