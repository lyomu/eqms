package com.eqms.materials.dto;

import jakarta.validation.constraints.NotNull;

/** Generic material workflow action: expected version (optimistic check) + reason. */
public record MaterialTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
