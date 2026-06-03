package com.eqms.products.dto;

import jakarta.validation.constraints.NotNull;

/** Generic product workflow action: expected version (optimistic check) + reason. */
public record ProductTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
