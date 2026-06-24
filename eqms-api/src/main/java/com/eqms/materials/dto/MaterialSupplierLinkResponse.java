package com.eqms.materials.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.materials.MaterialSupplierLink;

public record MaterialSupplierLinkResponse(
        Long id,
        Long materialId,
        Long supplierId,
        boolean approvedForMaterial,
        String scopeOfApproval,
        String approvalConditions,
        LocalDate effectiveDate,
        LocalDate reviewDate,
        Instant createdAt,
        Long createdBy
) {
    public static MaterialSupplierLinkResponse from(MaterialSupplierLink l) {
        return new MaterialSupplierLinkResponse(
                l.getId(),
                l.getMaterialId(),
                l.getSupplierId(),
                l.isApprovedForMaterial(),
                l.getScopeOfApproval(),
                l.getApprovalConditions(),
                l.getEffectiveDate(),
                l.getReviewDate(),
                l.getCreatedAt(),
                l.getCreatedBy());
    }
}
