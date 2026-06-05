package com.eqms.managementreview.dto;

public record AddProductFeedbackRequest(
        Integer complaintsCount,
        Integer returnsCount,
        Integer seriousAdverseEvents,
        String reason
) {
}
