package com.eqms.common.dto;

import java.time.Instant;

import com.eqms.audit.AuditLog;

/**
 * Generic read-only audit-trail entry (who/what/when-UTC/reason) returned by any module's
 * audit-trail viewer (compliance rule 1). Shared across modules.
 */
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
