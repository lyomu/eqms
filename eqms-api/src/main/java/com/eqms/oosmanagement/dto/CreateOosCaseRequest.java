package com.eqms.oosmanagement.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;

public record CreateOosCaseRequest(
        Long productId,
        String testMethod,
        BigDecimal specificationLimitMin,
        BigDecimal specificationLimitMax,
        @NotBlank String reportedResult,
        String reportedByName
) {
}
