package com.eqms.audits.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.audits.AuditActionPlan;

public record AuditActionPlanResponse(
        Long id,
        Long auditId,
        Long findingId,
        String actionType,
        String description,
        String rootCauseAnalysis,
        Long actionOwnerId,
        LocalDate dueDate,
        String priority,
        String status,
        String completionEvidence,
        Long completedById,
        LocalDate completionDate,
        Long verifiedById,
        LocalDate verificationDate,
        boolean effectivenessCheckRequired,
        LocalDate effectivenessCheckDate,
        String effectivenessResult,
        String comments,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        Long updatedBy
) {
    public static AuditActionPlanResponse from(AuditActionPlan p) {
        return new AuditActionPlanResponse(
                p.getId(), p.getAuditId(), p.getFindingId(),
                p.getActionType() != null ? p.getActionType().name() : null,
                p.getDescription(), p.getRootCauseAnalysis(), p.getActionOwnerId(),
                p.getDueDate(), p.getPriority(),
                p.getStatus() != null ? p.getStatus().name() : null,
                p.getCompletionEvidence(), p.getCompletedById(), p.getCompletionDate(),
                p.getVerifiedById(), p.getVerificationDate(),
                p.isEffectivenessCheckRequired(), p.getEffectivenessCheckDate(),
                p.getEffectivenessResult() != null ? p.getEffectivenessResult().name() : null,
                p.getComments(), p.getCreatedAt(), p.getCreatedBy(),
                p.getUpdatedAt(), p.getUpdatedBy());
    }
}
