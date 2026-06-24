package com.eqms.audits.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateLinkedRecordRequest(
        @NotBlank String recordType,
        @NotBlank String recordId,
        String recordReference,
        String recordTitle,
        String recordStatus,
        String notes
) {
}
