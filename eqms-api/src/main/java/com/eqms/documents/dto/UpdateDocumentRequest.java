package com.eqms.documents.dto;

import com.eqms.documents.DocumentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Edit a Draft document. {@code expectedVersion} drives the optimistic-lock check (rule 5);
 * {@code reason} is recorded in the audit trail. Only permitted while the document is in Draft.
 */
public record UpdateDocumentRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String title,
        @NotNull DocumentType type,
        @NotBlank String content,
        @Positive Integer reviewPeriodMonths,
        Long folderId,
        String reason
) {
    /** Backwards-compatible form from before folder assignment was added. */
    public UpdateDocumentRequest(Integer expectedVersion, String title, DocumentType type, String content,
                                 Integer reviewPeriodMonths, String reason) {
        this(expectedVersion, title, type, content, reviewPeriodMonths, null, reason);
    }
}
