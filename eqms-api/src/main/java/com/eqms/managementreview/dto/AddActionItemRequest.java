package com.eqms.managementreview.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;

public record AddActionItemRequest(
        @NotBlank String actionDescription,
        Long ownerId,
        LocalDate dueDate,
        String reason
) {
}
