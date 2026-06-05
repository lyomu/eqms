package com.eqms.equipment.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;

public record AddSpecificationRequest(
        @NotBlank String specificationKey,
        String specificationValue,
        String unit,
        BigDecimal acceptanceRangeMin,
        BigDecimal acceptanceRangeMax
) {
}
