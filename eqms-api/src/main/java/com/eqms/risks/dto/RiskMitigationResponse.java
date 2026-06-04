package com.eqms.risks.dto;

import java.time.Instant;

import com.eqms.risks.RiskMitigation;

public record RiskMitigationResponse(
        Long id,
        Long riskId,
        String controlDescription,
        String controlType,
        Long ownerId,
        Instant implementationDate,
        String verificationMethod,
        Instant createdAt
) {
    public static RiskMitigationResponse from(RiskMitigation m) {
        return new RiskMitigationResponse(m.getId(), m.getRiskId(), m.getControlDescription(),
                m.getControlType().name(), m.getOwnerId(), m.getImplementationDate(),
                m.getVerificationMethod(), m.getCreatedAt());
    }
}
