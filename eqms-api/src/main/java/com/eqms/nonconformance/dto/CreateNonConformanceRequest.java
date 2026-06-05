package com.eqms.nonconformance.dto;

import com.eqms.nonconformance.NcType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateNonConformanceRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotNull NcType ncType,
        Long affectedItemId,
        String affectedItemType,
        String discoveredBy
) {
}
