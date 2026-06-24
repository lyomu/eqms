package com.eqms.materials.dto;

import jakarta.validation.constraints.NotBlank;

public record DisposeLotRequest(
        int expectedVersion,
        @NotBlank String disposalReason
) {
}
