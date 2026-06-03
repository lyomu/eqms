package com.eqms.products.dto;

import java.time.Instant;

import com.eqms.products.Product;

public record ProductResponse(
        Long id,
        String productCode,
        String name,
        String dosageForm,
        String strength,
        String description,
        String registrationNumber,
        String status,
        int version,
        Long createdBy,
        Long submittedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getProductCode(),
                p.getName(),
                p.getDosageForm().name(),
                p.getStrength(),
                p.getDescription(),
                p.getRegistrationNumber(),
                p.getProductStatus().name(),
                p.getVersion(),
                p.getCreatedBy(),
                p.getSubmittedBy(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
