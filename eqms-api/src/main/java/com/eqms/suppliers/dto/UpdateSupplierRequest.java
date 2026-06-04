package com.eqms.suppliers.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateSupplierRequest(
        @NotNull Integer expectedVersion,
        String supplierName,
        String contactPerson,
        String email,
        String phone,
        String location,
        String reason
) {
}
