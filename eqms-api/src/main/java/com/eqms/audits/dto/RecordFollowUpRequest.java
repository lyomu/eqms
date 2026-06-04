package com.eqms.audits.dto;

import com.eqms.audits.FollowUpStatus;

import jakarta.validation.constraints.NotNull;

/** Record, on the current audit, the follow-up status of a finding from a previous audit. */
public record RecordFollowUpRequest(
        @NotNull Integer expectedVersion,
        @NotNull Long previousAuditId,
        Long findingId,
        @NotNull FollowUpStatus status,
        String notes,
        String reason
) {
}
