package com.eqms.products.dto;

import jakarta.validation.constraints.NotNull;

/** Edit product details while in DRAFT (version-checked, audited). */
public record UpdateProductRequest(
        @NotNull Integer expectedVersion,
        String description,
        String strength,
        String registrationNumber,
        String reason
) {
}
