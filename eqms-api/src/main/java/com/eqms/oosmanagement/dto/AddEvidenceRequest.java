package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosEvidenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
public record AddEvidenceRequest(
    @NotNull OosEvidenceType evidenceType,
    @NotBlank String title,
    String description,
    String fileName,
    Long fileSize,
    String contentType,
    Long attachmentId,
    String reason
) {}
