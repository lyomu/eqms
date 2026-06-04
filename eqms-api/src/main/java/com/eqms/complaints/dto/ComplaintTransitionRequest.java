package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotNull;

/** Generic non-signed transition body (e.g. cancel). */
public record ComplaintTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
