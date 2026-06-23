package com.eqms.deviations.dto;

import java.time.Instant;

import com.eqms.deviations.DeviationLinkedRecord;

public record LinkedRecordResponse(
        Long id,
        Long deviationId,
        String linkedRecordType,
        Long linkedRecordId,
        String linkedRecordNumber,
        String notes,
        Long createdBy,
        Instant createdAt
) {
    public static LinkedRecordResponse from(DeviationLinkedRecord r) {
        return new LinkedRecordResponse(
                r.getId(),
                r.getDeviationId(),
                r.getLinkedRecordType(),
                r.getLinkedRecordId(),
                r.getLinkedRecordNumber(),
                r.getNotes(),
                r.getCreatedBy(),
                r.getCreatedAt());
    }
}
