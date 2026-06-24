package com.eqms.audits.dto;

import java.time.Instant;

import com.eqms.audits.AuditChecklistItem;

public record AuditChecklistItemResponse(
        Long id,
        Long auditId,
        String section,
        String requirementReference,
        String question,
        String expectedEvidence,
        String checklistMethod,
        Long responsibleAuditorId,
        boolean applicable,
        String response,
        String evidenceSummary,
        boolean findingRequired,
        Long linkedFindingId,
        String comments,
        int sortOrder,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        Long updatedBy
) {
    public static AuditChecklistItemResponse from(AuditChecklistItem item) {
        return new AuditChecklistItemResponse(
                item.getId(), item.getAuditId(), item.getSection(), item.getRequirementReference(),
                item.getQuestion(), item.getExpectedEvidence(),
                item.getChecklistMethod() != null ? item.getChecklistMethod().name() : null,
                item.getResponsibleAuditorId(), item.isApplicable(),
                item.getResponse() != null ? item.getResponse().name() : null,
                item.getEvidenceSummary(), item.isFindingRequired(), item.getLinkedFindingId(),
                item.getComments(), item.getSortOrder(),
                item.getCreatedAt(), item.getCreatedBy(),
                item.getUpdatedAt(), item.getUpdatedBy());
    }
}
