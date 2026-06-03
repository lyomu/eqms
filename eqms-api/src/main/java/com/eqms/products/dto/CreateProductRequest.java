package com.eqms.products.dto;

import com.eqms.products.DosageForm;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateProductRequest(
        @NotBlank String name,
        @NotNull DosageForm dosageForm,
        String strength,
        String description,
        String registrationNumber
) {
}
