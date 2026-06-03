package com.eqms.capa.dto;

import java.time.Instant;

import com.eqms.capa.CapaActionType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Add a corrective/preventive action item to a CAPA. */
public record CreateCapaActionRequest(
        @NotNull CapaActionType actionType,
        @NotBlank String description,
        Long assignedTo,
        Instant dueDate
) {
}
