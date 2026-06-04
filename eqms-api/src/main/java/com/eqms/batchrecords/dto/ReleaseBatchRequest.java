package com.eqms.batchrecords.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReleaseBatchRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
