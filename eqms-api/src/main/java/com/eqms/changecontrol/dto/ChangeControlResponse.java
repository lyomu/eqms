package com.eqms.changecontrol.dto;

import java.time.Instant;

import com.eqms.changecontrol.ChangeControl;

public record ChangeControlResponse(
        Long id,
        String changeNumber,
        String title,
        String type,
        String status,
        int version,
        String description,
        String justification,
        boolean effectivenessCheckRequired,
        Instant targetImplementationDate,
        Instant implementedDate,
        Instant closedDate,
        Long createdBy,
        Long submittedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static ChangeControlResponse from(ChangeControl c) {
        return new ChangeControlResponse(
                c.getId(),
                c.getChangeNumber(),
                c.getTitle(),
                c.getChangeType().name(),
                c.getChangeStatus().name(),
                c.getVersion(),
                c.getDescription(),
                c.getJustification(),
                c.isEffectivenessCheckRequired(),
                c.getTargetImplementationDate(),
                c.getImplementedDate(),
                c.getClosedDate(),
                c.getCreatedBy(),
                c.getSubmittedBy(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }
}
