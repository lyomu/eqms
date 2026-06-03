package com.eqms.capa.dto;

import java.time.Instant;

import com.eqms.capa.CapaAction;

public record CapaActionResponse(
        Long id,
        Long capaId,
        String actionType,
        String description,
        Long assignedTo,
        Instant dueDate,
        Instant completedDate,
        int version
) {
    public static CapaActionResponse from(CapaAction a) {
        return new CapaActionResponse(
                a.getId(),
                a.getCapaId(),
                a.getActionType().name(),
                a.getDescription(),
                a.getAssignedTo(),
                a.getDueDate(),
                a.getCompletedDate(),
                a.getVersion());
    }
}
