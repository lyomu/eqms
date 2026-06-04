package com.eqms.audits.dto;

import java.time.Instant;

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
        Long createdBy
) {
    public static AuditFindingResponse from(AuditFinding f) {
        return new AuditFindingResponse(f.getId(), f.getAuditId(), f.getFindingNumber(), f.getDescription(),
                f.getArea(), f.getSeverity().name(), f.getEvidence(), f.getRootCause(),
                f.isCorrectiveActionRequired(), f.getCreatedAt(), f.getCreatedBy());
    }
}
