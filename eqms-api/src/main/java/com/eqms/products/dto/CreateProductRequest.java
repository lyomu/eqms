package com.eqms.products.dto;

import com.eqms.products.DosageForm;
import com.eqms.products.ProductCriticality;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateProductRequest(
        @NotBlank String name,
        DosageForm dosageForm,
        String productType,
        String category,
        String strength,
        String description,
        String intendedUse,
        ProductCriticality criticality,
        Long ownerId,
        String department,
        String siteLocation,
        String revision,
        String specificationReference,
        String storageRequirements,
        String shelfLife,
        Boolean expiryRequired,
        Boolean qcTestingRequired,
        Boolean batchLotTrackingRequired,
        String regulatoryCustomerRequirements,
        String notes,
        String registrationNumber
) {
    public CreateProductRequest(String name, DosageForm dosageForm, String strength, String description,
                                String registrationNumber) {
        this(name, dosageForm, dosageForm == null ? null : dosageForm.name(), null, strength, description, null,
                null, null, null, null, "A", registrationNumber, null, null,
                false, false, false, null, null, registrationNumber);
    }
}
