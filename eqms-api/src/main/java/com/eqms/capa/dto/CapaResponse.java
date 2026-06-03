package com.eqms.capa.dto;

import java.time.Instant;

import com.eqms.capa.Capa;

public record CapaResponse(
        Long id,
        String capaNumber,
        String title,
        String source,
        String status,
        int version,
        String description,
        String rootCause,
        boolean effectivenessCheckRequired,
        String effectivenessCheckResult,
        Instant dueDate,
        Instant closedDate,
        Long createdBy,
        Long submittedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static CapaResponse from(Capa c) {
        return new CapaResponse(
                c.getId(),
                c.getCapaNumber(),
                c.getTitle(),
                c.getSource().name(),
                c.getCapaStatus().name(),
                c.getVersion(),
                c.getDescription(),
                c.getRootCause(),
                c.isEffectivenessCheckRequired(),
                c.getEffectivenessCheckResult(),
                c.getDueDate(),
                c.getClosedDate(),
                c.getCreatedBy(),
                c.getSubmittedBy(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }
}
