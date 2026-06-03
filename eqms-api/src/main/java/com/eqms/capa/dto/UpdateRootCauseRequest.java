package com.eqms.capa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Record/update the root-cause analysis (a field edit, version-checked and audited). */
public record UpdateRootCauseRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String rootCause,
        String reason
) {
}
