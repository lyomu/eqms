package com.eqms.materials.dto;

import jakarta.validation.constraints.NotBlank;

public record HoldLotRequest(
        int expectedVersion,
        @NotBlank String holdReason
) {
}
