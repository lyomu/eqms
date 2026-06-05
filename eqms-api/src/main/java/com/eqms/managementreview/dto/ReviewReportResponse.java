package com.eqms.managementreview.dto;

import java.time.LocalDate;

/**
 * Quality performance summary generated from the inputs captured on a management review.
 * Aggregates audit findings, product feedback, action-item closure, and counts of metrics
 * and documented decisions.
 */
public record ReviewReportResponse(
        Long reviewId,
        String reviewNo,
        LocalDate reviewDate,
        String status,
        int metricsCount,
        int auditsReviewed,
        int totalCriticalFindings,
        int totalMajorFindings,
        int totalMinorFindings,
        int totalComplaints,
        int totalReturns,
        int totalSeriousAdverseEvents,
        int actionItemsTotal,
        int actionItemsOpen,
        int actionItemsCompleted,
        int decisionsCount
) {
}
