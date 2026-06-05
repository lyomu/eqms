package com.eqms.nonconformance.dto;

import com.eqms.nonconformance.NcType;

import jakarta.validation.constraints.NotNull;

public record UpdateNonConformanceRequest(
        @NotNull Integer expectedVersion,
        String title,
        String description,
        NcType ncType,
        String affectedItemType,
        String reason
) {
}
