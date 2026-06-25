package com.eqms.oosmanagement.dto;
import jakarta.validation.constraints.NotBlank;
public record QaReviewDecisionRequest(
    @NotBlank String action,
    int expectedVersion,
    String reason
) {}
