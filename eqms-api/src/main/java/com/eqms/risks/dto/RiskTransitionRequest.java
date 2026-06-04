package com.eqms.risks.dto;

import jakarta.validation.constraints.NotNull;

/** Generic non-signed transition body (close, cancel). */
public record RiskTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
