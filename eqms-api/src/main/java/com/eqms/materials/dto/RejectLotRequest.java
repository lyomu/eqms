package com.eqms.materials.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectLotRequest(
        int expectedVersion,
        @NotBlank String rejectionReason
) {
}
