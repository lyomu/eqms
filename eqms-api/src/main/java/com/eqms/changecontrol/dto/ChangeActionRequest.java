package com.eqms.changecontrol.dto;

import jakarta.validation.constraints.NotNull;

/** Generic change-control workflow action: expected version (optimistic check) + reason. */
public record ChangeActionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
