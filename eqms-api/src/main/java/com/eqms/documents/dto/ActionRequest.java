package com.eqms.documents.dto;

import jakarta.validation.constraints.NotNull;

/** Generic workflow action body: the expected version (optimistic check) and a reason for change. */
public record ActionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
