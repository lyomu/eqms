package com.eqms.documents.dto;

import com.eqms.documents.DocumentType;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CreateDocumentRequest(
        @NotBlank String title,
        @NotNull DocumentType type,
        @NotBlank String content,
        @Positive Integer reviewPeriodMonths,
        Long folderId,
        Long ownerId,
        Long approvalProfileId,
        @Size(max = 2000) String keywords,
        @Size(max = 1000) String referenceUrl,
        @Positive Integer majorVersion,
        @PositiveOrZero Integer minorVersion,
        Boolean pdfRenditionRequired,
        List<Long> referenceDocumentIds
) {
    public CreateDocumentRequest(String title, DocumentType type, String content, Integer reviewPeriodMonths) {
        this(title, type, content, reviewPeriodMonths, null);
    }

    public CreateDocumentRequest(String title, DocumentType type, String content,
                                 Integer reviewPeriodMonths, Long folderId) {
        this(title, type, content, reviewPeriodMonths, folderId, null, null, null, null,
                1, 0, true, List.of());
    }
}
