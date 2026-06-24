package com.eqms.audits.dto;

import java.time.Instant;

import com.eqms.audits.AuditEvidence;

public record AuditEvidenceResponse(
        Long id,
        Long auditId,
        String evidenceType,
        String description,
        String referenceNumber,
        String areaAudited,
        String personInterviewed,
        String recordsReviewed,
        Long relatedChecklistItemId,
        Long relatedFindingId,
        String auditorNotes,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        Long updatedBy
) {
    public static AuditEvidenceResponse from(AuditEvidence e) {
        return new AuditEvidenceResponse(
                e.getId(), e.getAuditId(),
                e.getEvidenceType() != null ? e.getEvidenceType().name() : null,
                e.getDescription(), e.getReferenceNumber(), e.getAreaAudited(),
                e.getPersonInterviewed(), e.getRecordsReviewed(),
                e.getRelatedChecklistItemId(), e.getRelatedFindingId(),
                e.getAuditorNotes(), e.getCreatedAt(), e.getCreatedBy(),
                e.getUpdatedAt(), e.getUpdatedBy());
    }
}
