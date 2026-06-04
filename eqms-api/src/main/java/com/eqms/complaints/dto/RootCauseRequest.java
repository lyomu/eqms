package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotBlank;

/** Record the root cause and the analysis method on the complaint's investigation. */
public record RootCauseRequest(
        @NotBlank String rootCause,
        String rootCauseMethod,
        String reason
) {
}
