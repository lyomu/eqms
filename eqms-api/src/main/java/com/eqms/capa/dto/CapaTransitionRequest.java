package com.eqms.capa.dto;

import jakarta.validation.constraints.NotNull;

/** Generic CAPA workflow action: expected version (optimistic check) + reason. */
public record CapaTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
