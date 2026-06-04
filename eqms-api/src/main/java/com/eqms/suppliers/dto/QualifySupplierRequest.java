package com.eqms.suppliers.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Qualify a supplier: records the qualification assessment and requires a sign-off signature. */
public record QualifySupplierRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String assessmentMethod,
        String notes,
        @NotBlank String reason,
        @NotBlank String password,
        String totpCode,
        String meaningStatement
) {
}
