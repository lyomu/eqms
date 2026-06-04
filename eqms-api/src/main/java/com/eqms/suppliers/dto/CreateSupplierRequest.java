package com.eqms.suppliers.dto;

import com.eqms.suppliers.SupplierType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSupplierRequest(
        @NotBlank String supplierName,
        @NotNull SupplierType supplierType,
        String contactPerson,
        String email,
        String phone,
        @NotBlank String location
) {
}
