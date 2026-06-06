package com.eqms.training.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotEmpty;

/** Bulk assignment request for POST /api/training/{id}/assign-users. */
public record AssignUsersRequest(
        @NotEmpty List<Long> userIds,
        Instant dueDate
) {
}
