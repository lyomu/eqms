package com.eqms.deviations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateLinkedRecordRequest(
        @NotBlank String linkedRecordType,
        @NotNull Long linkedRecordId,
        String linkedRecordNumber,
        String notes
) {
}
