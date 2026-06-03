package com.eqms.documents.dto;

import java.time.Instant;

import com.eqms.audit.AuditLog;

/** Read-only audit-trail entry: who did what, when (UTC), and the reason for change (rule 1). */
public record AuditEntryResponse(
        Long id,
        String action,
        String fieldName,
        String oldValue,
        String newValue,
        String reasonForChange,
        Long userId,
        String userFullName,
        Instant utcTimestamp,
        String ipAddress,
        String userAgent
) {
    public static AuditEntryResponse from(AuditLog log) {
        return new AuditEntryResponse(
                log.getId(),
                log.getAction().name(),
                log.getFieldName(),
                log.getOldValue(),
                log.getNewValue(),
                log.getReasonForChange(),
                log.getUserId(),
                log.getUserFullName(),
                log.getUtcTimestamp(),
                log.getIpAddress(),
                log.getUserAgent());
    }
}
