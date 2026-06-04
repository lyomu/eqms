package com.eqms.complaints.dto;

import jakarta.validation.constraints.NotBlank;

/** Document the product impact on the complaint's investigation. */
public record ImpactAssessmentRequest(
        @NotBlank String impactOnProduct,
        String reason
) {
}
