package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotNull;

/** Link an existing CAPA to a complaint. */
public record LinkCapaRequest(
        @NotNull Long capaId,
        String reason
) {
}
