package com.eqms.audits.dto;

import java.time.Instant;

import com.eqms.audits.AuditLinkedRecord;

public record AuditLinkedRecordResponse(
        Long id,
        Long auditId,
        String recordType,
        String recordId,
        String recordReference,
        String recordTitle,
        String recordStatus,
        String notes,
        Instant createdAt,
        Long createdBy
) {
    public static AuditLinkedRecordResponse from(AuditLinkedRecord r) {
        return new AuditLinkedRecordResponse(
                r.getId(), r.getAuditId(),
                r.getRecordType() != null ? r.getRecordType().name() : null,
                r.getRecordId(), r.getRecordReference(), r.getRecordTitle(),
                r.getRecordStatus(), r.getNotes(),
                r.getCreatedAt(), r.getCreatedBy());
    }
}
