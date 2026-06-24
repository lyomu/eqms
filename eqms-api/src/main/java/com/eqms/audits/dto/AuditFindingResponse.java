package com.eqms.audits.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.audits.AuditFinding;

public record AuditFindingResponse(
        Long id,
        Long auditId,
        Integer findingNumber,
        String description,
        String area,
        String severity,
        String evidence,
        String rootCause,
        boolean correctiveActionRequired,
        Instant createdAt,
        Long createdBy,
        String findingCode,
        String title,
        String findingType,
        String riskLevel,
        String requirementReference,
        Long responsibleOwnerId,
        boolean immediateCorrectionRequired,
        boolean rootCauseRequired,
        boolean capaRequired,
        LocalDate dueDate,
        String findingStatus,
        boolean recurrenceFlag,
        Long closedById,
        Instant closedAt,
        String closureComments,
        Instant updatedAt
) {
    public static AuditFindingResponse from(AuditFinding f) {
        return new AuditFindingResponse(
                f.getId(), f.getAuditId(), f.getFindingNumber(), f.getDescription(),
                f.getArea(), f.getSeverity().name(), f.getEvidence(), f.getRootCause(),
                f.isCorrectiveActionRequired(), f.getCreatedAt(), f.getCreatedBy(),
                f.getFindingCode(), f.getTitle(),
                f.getFindingType() != null ? f.getFindingType().name() : null,
                f.getRiskLevel() != null ? f.getRiskLevel().name() : null,
                f.getRequirementReference(), f.getResponsibleOwnerId(),
                f.isImmediateCorrectionRequired(), f.isRootCauseRequired(), f.isCapaRequired(),
                f.getDueDate(),
                f.getFindingStatus() != null ? f.getFindingStatus().name() : null,
                f.isRecurrenceFlag(), f.getClosedById(), f.getClosedAt(), f.getClosureComments(),
                f.getUpdatedAt());
    }
}
