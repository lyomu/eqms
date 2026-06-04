package com.eqms.suppliers.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

/** Create a CAPA (source = SUPPLIER) from a supplier finding and link it. */
public record CreateCapaFromFindingRequest(
        @NotNull Long findingId,
        String title,
        String description,
        boolean effectivenessCheckRequired,
        Instant dueDate,
        String reason
) {
}
