package com.eqms.managementreview.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.eqms.managementreview.ManagementReview;
import com.eqms.managementreview.ReviewActionItem;
import com.eqms.managementreview.ReviewAuditResult;
import com.eqms.managementreview.ReviewDecision;
import com.eqms.managementreview.ReviewMetric;
import com.eqms.managementreview.ReviewProductFeedback;

public record ManagementReviewResponse(
        Long id,
        String reviewNo,
        LocalDate reviewDate,
        String participants,
        String scope,
        String status,
        Long submittedBy,
        Instant approvedDate,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        List<MetricDetail> metrics,
        List<AuditResultDetail> auditResults,
        List<ProductFeedbackDetail> productFeedback,
        List<ActionItemResponse> actionItems,
        List<DecisionDetail> decisions
) {
    public record MetricDetail(String metricName, String metricValue, String period, String trend) {
        public static MetricDetail from(ReviewMetric m) {
            return new MetricDetail(m.getMetricName(), m.getMetricValue(), m.getPeriod(),
                    m.getTrend() == null ? null : m.getTrend().name());
        }
    }

    public record AuditResultDetail(Long auditId, Integer criticalFindings, Integer majorFindings,
                                    Integer minorFindings) {
        public static AuditResultDetail from(ReviewAuditResult r) {
            return new AuditResultDetail(r.getAuditId(), r.getCriticalFindings(), r.getMajorFindings(),
                    r.getMinorFindings());
        }
    }

    public record ProductFeedbackDetail(Integer complaintsCount, Integer returnsCount,
                                        Integer seriousAdverseEvents) {
        public static ProductFeedbackDetail from(ReviewProductFeedback f) {
            return new ProductFeedbackDetail(f.getComplaintsCount(), f.getReturnsCount(),
                    f.getSeriousAdverseEvents());
        }
    }

    public record DecisionDetail(String decisionDescription, String decisionArea, String impact,
                                 Long documentedBy, Instant documentedDate) {
        public static DecisionDetail from(ReviewDecision d) {
            return new DecisionDetail(d.getDecisionDescription(), d.getDecisionArea(), d.getImpact(),
                    d.getDocumentedBy(), d.getDocumentedDate());
        }
    }

    public static ManagementReviewResponse from(ManagementReview r,
                                                List<ReviewMetric> metrics,
                                                List<ReviewAuditResult> auditResults,
                                                List<ReviewProductFeedback> productFeedback,
                                                List<ReviewActionItem> actionItems,
                                                List<ReviewDecision> decisions) {
        return new ManagementReviewResponse(
                r.getId(), r.getReviewNo(), r.getReviewDate(), r.getParticipants(), r.getScope(),
                r.getMrStatus().name(), r.getSubmittedBy(), r.getApprovedDate(), r.getVersion(),
                r.getCreatedAt(), r.getCreatedBy(), r.getUpdatedAt(),
                metrics.stream().map(MetricDetail::from).toList(),
                auditResults.stream().map(AuditResultDetail::from).toList(),
                productFeedback.stream().map(ProductFeedbackDetail::from).toList(),
                actionItems.stream().map(ActionItemResponse::from).toList(),
                decisions.stream().map(DecisionDetail::from).toList());
    }

    public static ManagementReviewResponse summary(ManagementReview r) {
        return new ManagementReviewResponse(
                r.getId(), r.getReviewNo(), r.getReviewDate(), r.getParticipants(), r.getScope(),
                r.getMrStatus().name(), r.getSubmittedBy(), r.getApprovedDate(), r.getVersion(),
                r.getCreatedAt(), r.getCreatedBy(), r.getUpdatedAt(),
                List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
