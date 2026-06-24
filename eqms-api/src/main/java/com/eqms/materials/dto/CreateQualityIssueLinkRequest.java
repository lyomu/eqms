package com.eqms.materials.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateQualityIssueLinkRequest(
        @NotBlank String recordType,
        @NotBlank String recordId,
        String recordReference,
        String recordTitle,
        String recordStatus,
        Long materialLotId,
        String notes
) {
}
