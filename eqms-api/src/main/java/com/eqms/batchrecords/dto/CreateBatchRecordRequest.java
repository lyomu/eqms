package com.eqms.batchrecords.dto;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateBatchRecordRequest(
        @NotNull Long productId,
        @NotBlank String productCode,
        @NotNull @DecimalMin("0.001") BigDecimal batchSize,
        @NotBlank String unit,
        @NotNull Instant manufacturingStartDate,
        String notes
) {
}
