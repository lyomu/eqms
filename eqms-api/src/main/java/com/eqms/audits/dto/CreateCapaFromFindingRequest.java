package com.eqms.audits.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

/** Create a CAPA (source = AUDIT_FINDING) from a specific audit finding and link it. */
public record CreateCapaFromFindingRequest(
        @NotNull Long findingId,
        String title,
        String description,
        boolean effectivenessCheckRequired,
        Instant dueDate,
        String reason
) {
}
