package com.eqms.deviations.dto;

import java.time.LocalDate;

import com.eqms.deviations.ContainmentActionType;

import jakarta.validation.constraints.NotBlank;

public record CreateContainmentActionRequest(
        @NotBlank String description,
        ContainmentActionType actionType,
        Long ownerId,
        LocalDate dueDate,
        String comments
) {
}
