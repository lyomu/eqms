package com.eqms.audits.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.audits.Audit;

/** Detail view of an audit, including its findings. */
public record AuditResponse(
        Long id,
        String auditNo,
        String auditTitle,
        String auditType,
        String status,
        int version,
        Instant auditDate,
        Long auditorId,
        Long auditeeId,
        String scope,
        Long submittedBy,
        Instant completedDate,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        List<AuditFindingResponse> findings
) {
    public static AuditResponse from(Audit a, List<AuditFindingResponse> findings) {
        return new AuditResponse(
                a.getId(), a.getAuditNo(), a.getAuditTitle(), a.getAuditType().name(),
                a.getAuditStatus().name(), a.getVersion(), a.getAuditDate(), a.getAuditorId(),
                a.getAuditeeId(), a.getScope(), a.getSubmittedBy(), a.getCompletedDate(),
                a.getCreatedAt(), a.getCreatedBy(), a.getUpdatedAt(), findings);
    }

    public static AuditResponse summary(Audit a) {
        return from(a, List.of());
    }
}
