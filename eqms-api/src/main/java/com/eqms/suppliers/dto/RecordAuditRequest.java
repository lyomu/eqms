package com.eqms.suppliers.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;

/** Record a supplier audit / qualification assessment (does not itself change status). */
public record RecordAuditRequest(
        @NotBlank String assessmentMethod,
        String assessor,
        String approvalStatus,
        Instant assessmentDate,
        String notes
) {
}
