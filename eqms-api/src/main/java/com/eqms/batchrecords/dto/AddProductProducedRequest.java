package com.eqms.batchrecords.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AddProductProducedRequest(
        Long productId,
        @NotBlank String productCode,
        @NotBlank String lotNumberAssigned,
        @NotNull @DecimalMin("0.001") BigDecimal quantity,
        @NotBlank String unit
) {
}
