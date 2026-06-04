package com.eqms.batchrecords.dto;

import jakarta.validation.constraints.NotNull;

public record BatchTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
