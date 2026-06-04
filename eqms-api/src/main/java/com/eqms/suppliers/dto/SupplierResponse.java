package com.eqms.suppliers.dto;

import java.time.Instant;

import com.eqms.suppliers.Supplier;

public record SupplierResponse(
        Long id,
        String supplierCode,
        String supplierName,
        String supplierType,
        String contactPerson,
        String email,
        String phone,
        String location,
        String status,
        int version,
        Instant qualificationDate,
        Long ownerId,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt
) {
    public static SupplierResponse from(Supplier s) {
        return new SupplierResponse(
                s.getId(), s.getSupplierCode(), s.getSupplierName(), s.getSupplierType().name(),
                s.getContactPerson(), s.getEmail(), s.getPhone(), s.getLocation(),
                s.getSupplierStatus().name(), s.getVersion(), s.getQualificationDate(), s.getOwnerId(),
                s.getCreatedAt(), s.getCreatedBy(), s.getUpdatedAt());
    }
}
