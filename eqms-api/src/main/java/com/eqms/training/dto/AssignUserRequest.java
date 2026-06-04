package com.eqms.training.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

/** Assign a training program to a user. If no due date is given, it is derived from the frequency. */
public record AssignUserRequest(
        @NotNull Long userId,
        Instant dueDate
) {
}
