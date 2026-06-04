package com.eqms.suppliers.dto;

import java.time.Instant;

import com.eqms.suppliers.SupplierFinding;

public record SupplierFindingResponse(
        Long id,
        Long supplierId,
        Instant findingDate,
        String findingDescription,
        String severity,
        String rootCause,
        boolean correctiveActionRequired,
        Instant createdAt
) {
    public static SupplierFindingResponse from(SupplierFinding f) {
        return new SupplierFindingResponse(f.getId(), f.getSupplierId(), f.getFindingDate(),
                f.getFindingDescription(), f.getSeverity().name(), f.getRootCause(),
                f.isCorrectiveActionRequired(), f.getCreatedAt());
    }
}
