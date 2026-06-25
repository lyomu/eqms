package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosLinkedRecordType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
public record AddLinkedRecordRequest(
    @NotNull OosLinkedRecordType linkedRecordType,
    @NotBlank String linkedRecordId,
    String linkedRecordReference,
    String linkedRecordTitle,
    String linkedRecordStatus,
    String relationshipType,
    String notes,
    String reason
) {}
