package com.eqms.batchrecords.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LinkMaterialRequest(
        Long materialId,
        @NotBlank String materialCode,
        @NotBlank String lotNumber,
        String supplier,
        @NotNull @DecimalMin("0.001") BigDecimal quantityUsed,
        @NotBlank String unit
) {
}
