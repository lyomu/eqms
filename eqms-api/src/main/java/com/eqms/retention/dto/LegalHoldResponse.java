package com.eqms.retention.dto;

import java.time.Instant;

import com.eqms.retention.LegalHold;

public record LegalHoldResponse(
        Long id,
        String recordType,
        String recordId,
        String reason,
        boolean active,
        Instant releasedAt,
        String releaseReason
) {
    public static LegalHoldResponse from(LegalHold hold) {
        return new LegalHoldResponse(hold.getId(), hold.getRecordType(), hold.getRecordId(), hold.getReason(),
                hold.active(), hold.getReleasedAt(), hold.getReleaseReason());
    }
}
