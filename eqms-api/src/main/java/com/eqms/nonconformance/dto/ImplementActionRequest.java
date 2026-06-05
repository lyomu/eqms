package com.eqms.nonconformance.dto;

import jakarta.validation.constraints.NotNull;

public record ImplementActionRequest(
        @NotNull Integer expectedVersion,
        boolean reworkCompleted,
        String reason
) {
}
