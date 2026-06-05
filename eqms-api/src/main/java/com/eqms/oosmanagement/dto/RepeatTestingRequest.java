package com.eqms.oosmanagement.dto;

import jakarta.validation.constraints.NotNull;

public record RepeatTestingRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
