package com.eqms.materials.dto;

import jakarta.validation.constraints.NotNull;

/** Edit material details while in DRAFT (version-checked, audited). */
public record UpdateMaterialRequest(
        @NotNull Integer expectedVersion,
        String description,
        String specification,
        String reason
) {
}
