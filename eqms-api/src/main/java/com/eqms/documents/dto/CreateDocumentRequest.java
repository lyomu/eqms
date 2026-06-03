package com.eqms.documents.dto;

import com.eqms.documents.DocumentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateDocumentRequest(
        @NotBlank String title,
        @NotNull DocumentType type,
        @NotBlank String content,
        @Positive Integer reviewPeriodMonths
) {
}
