package com.eqms.deviations.dto;

import jakarta.validation.constraints.NotNull;

/** Generic deviation workflow action: expected version (optimistic check) + reason. */
public record DeviationTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
