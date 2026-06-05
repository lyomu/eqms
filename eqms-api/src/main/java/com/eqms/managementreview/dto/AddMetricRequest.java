package com.eqms.managementreview.dto;

import com.eqms.managementreview.MetricTrend;

import jakarta.validation.constraints.NotBlank;

public record AddMetricRequest(
        @NotBlank String metricName,
        String metricValue,
        String period,
        MetricTrend trend,
        String reason
) {
}
