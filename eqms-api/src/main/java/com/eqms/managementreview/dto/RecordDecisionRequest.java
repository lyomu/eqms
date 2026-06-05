package com.eqms.managementreview.dto;

import jakarta.validation.constraints.NotBlank;

public record RecordDecisionRequest(
        @NotBlank String decisionDescription,
        String decisionArea,
        String impact,
        String reason
) {
}
