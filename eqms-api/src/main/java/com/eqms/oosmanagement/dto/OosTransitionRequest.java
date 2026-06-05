package com.eqms.oosmanagement.dto;

import jakarta.validation.constraints.NotNull;

public record OosTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
