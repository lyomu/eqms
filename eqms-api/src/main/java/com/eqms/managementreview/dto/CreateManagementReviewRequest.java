package com.eqms.managementreview.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record CreateManagementReviewRequest(
        @NotNull LocalDate reviewDate,
        String participants,
        String scope
) {
}
