package com.eqms.materials.dto;

import jakarta.validation.constraints.NotBlank;

public record ReleaseLotRequest(
        int expectedVersion,
        @NotBlank String reason,
        String releaseConditions
) {
}
