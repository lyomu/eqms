package com.eqms.managementreview.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record UpdateManagementReviewRequest(
        @NotNull Integer expectedVersion,
        LocalDate reviewDate,
        String participants,
        String scope,
        String reason
) {
}
