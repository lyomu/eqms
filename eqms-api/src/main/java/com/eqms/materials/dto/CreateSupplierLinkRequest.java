package com.eqms.materials.dto;

import jakarta.validation.constraints.NotNull;

public record CreateSupplierLinkRequest(
        @NotNull Long supplierId,
        Boolean approvedForMaterial,
        String scopeOfApproval,
        String approvalConditions,
        String effectiveDate,
        String reviewDate
) {
}
