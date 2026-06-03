package com.eqms.documents.dto;

import jakarta.validation.constraints.NotNull;

/** Assign a "read & understood" task for a document to a user. */
public record AssignReadRequest(
        @NotNull Long assignedTo
) {
}
