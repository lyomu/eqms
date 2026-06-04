package com.eqms.suppliers.dto;

import java.math.BigDecimal;
import java.time.Instant;

import com.eqms.suppliers.SupplierPerformance;

public record SupplierPerformanceResponse(
        Long id,
        Instant assessmentPeriodStart,
        Instant assessmentPeriodEnd,
        BigDecimal onTimeDeliveryPct,
        BigDecimal qualityAcceptancePct,
        Integer responsivenessRating,
        Instant createdAt
) {
    public static SupplierPerformanceResponse from(SupplierPerformance p) {
        return new SupplierPerformanceResponse(p.getId(), p.getAssessmentPeriodStart(),
                p.getAssessmentPeriodEnd(), p.getOnTimeDeliveryPct(), p.getQualityAcceptancePct(),
                p.getResponsivenessRating(), p.getCreatedAt());
    }
}
