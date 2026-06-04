package com.eqms.suppliers.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;

public record UploadCertificateRequest(
        @NotBlank String certType,
        Instant issueDate,
        Instant expiryDate,
        String filePath
) {
}
