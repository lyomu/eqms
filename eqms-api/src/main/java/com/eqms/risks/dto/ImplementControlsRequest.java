package com.eqms.risks.dto;

import jakarta.validation.constraints.NotNull;

/** Mark mitigation controls implemented and move the risk to MITIGATED. */
public record ImplementControlsRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
