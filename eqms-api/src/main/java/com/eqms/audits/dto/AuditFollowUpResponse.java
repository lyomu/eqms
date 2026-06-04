package com.eqms.audits.dto;

import java.time.Instant;

import com.eqms.audits.AuditFollowUp;

public record AuditFollowUpResponse(
        Long id,
        Long currentAuditId,
        Long previousAuditId,
        Long findingId,
        String status,
        String notes,
        Instant createdAt
) {
    public static AuditFollowUpResponse from(AuditFollowUp f) {
        return new AuditFollowUpResponse(f.getId(), f.getCurrentAuditId(), f.getPreviousAuditId(),
                f.getFindingId(), f.getStatus().name(), f.getNotes(), f.getCreatedAt());
    }
}
