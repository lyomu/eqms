package com.eqms.suppliers.dto;

import java.time.Instant;

import com.eqms.suppliers.SupplierCertification;

public record SupplierCertificationResponse(
        Long id,
        String certType,
        Instant issueDate,
        Instant expiryDate,
        String filePath,
        Instant createdAt
) {
    public static SupplierCertificationResponse from(SupplierCertification c) {
        return new SupplierCertificationResponse(c.getId(), c.getCertType(), c.getIssueDate(),
                c.getExpiryDate(), c.getFilePath(), c.getCreatedAt());
    }
}
