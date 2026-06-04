package com.eqms.suppliers.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record RecordPerformanceRequest(
        Instant assessmentPeriodStart,
        Instant assessmentPeriodEnd,
        BigDecimal onTimeDeliveryPct,
        BigDecimal qualityAcceptancePct,
        Integer responsivenessRating
) {
}
