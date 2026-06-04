package com.eqms.suppliers.dto;

import jakarta.validation.constraints.NotNull;

/** Place a supplier on conditional status (limited use pending corrective action). */
public record ConditionalRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
