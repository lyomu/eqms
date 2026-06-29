package com.eqms.products.dto;

import com.eqms.products.ProductCriticality;

import jakarta.validation.constraints.NotNull;

/** Edit product details while in DRAFT (version-checked, audited). */
public record UpdateProductRequest(
        @NotNull Integer expectedVersion,
        String name,
        String productType,
        String category,
        String description,
        String intendedUse,
        ProductCriticality criticality,
        Long ownerId,
        String department,
        String siteLocation,
        String revision,
        String strength,
        String specificationReference,
        String storageRequirements,
        String shelfLife,
        Boolean expiryRequired,
        Boolean qcTestingRequired,
        Boolean batchLotTrackingRequired,
        String regulatoryCustomerRequirements,
        String notes,
        String registrationNumber,
        String reason
) {
    public UpdateProductRequest(Integer expectedVersion, String description, String strength,
                                String registrationNumber, String reason) {
        this(expectedVersion, null, null, null, description, null, null, null, null, null, null,
                strength, registrationNumber, null, null, false, false, false,
                null, null, registrationNumber, reason);
    }
}
