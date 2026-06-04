package com.eqms.audits.dto;

import jakarta.validation.constraints.NotNull;

/** Generic non-signed transition body (e.g. cancel). */
public record AuditTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
