package com.eqms.audits.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.audits.Audit;

/** Detail view of an audit, including its findings. */
public record AuditResponse(
        Long id,
        String auditNo,
        String auditTitle,
        String auditType,
        String status,
        int version,
        Instant auditDate,
        Long auditorId,
        Long auditeeId,
        String scope,
        Long submittedBy,
        Instant completedDate,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        List<AuditFindingResponse> findings,
        String objective,
        String criteria,
        String category,
        String department,
        String processArea,
        String site,
        String relatedModule,
        String riskLevel,
        Instant plannedStartDate,
        Instant plannedEndDate,
        Instant actualStartDate,
        Instant actualEndDate,
        Long leadAuditorId,
        String auditTeamMembers,
        Long auditeeOwnerId,
        Long auditSponsorId,
        String method,
        String frequency,
        String reasonForAudit,
        Long previousAuditId,
        boolean checklistRequired,
        boolean openingMeetingRequired,
        boolean closingMeetingRequired,
        boolean auditorIndependenceConfirmed,
        String closureStatus,
        Long closedById,
        Instant closedAt,
        String closureComments
) {
    public static AuditResponse from(Audit a, List<AuditFindingResponse> findings) {
        return new AuditResponse(
                a.getId(), a.getAuditNo(), a.getAuditTitle(), a.getAuditType().name(),
                a.getAuditStatus().name(), a.getVersion(), a.getAuditDate(), a.getAuditorId(),
                a.getAuditeeId(), a.getScope(), a.getSubmittedBy(), a.getCompletedDate(),
                a.getCreatedAt(), a.getCreatedBy(), a.getUpdatedAt(), findings,
                a.getObjective(), a.getCriteria(),
                a.getCategory() != null ? a.getCategory().name() : null,
                a.getDepartment(), a.getProcessArea(), a.getSite(), a.getRelatedModule(),
                a.getRiskLevel() != null ? a.getRiskLevel().name() : null,
                a.getPlannedStartDate(), a.getPlannedEndDate(),
                a.getActualStartDate(), a.getActualEndDate(),
                a.getLeadAuditorId(), a.getAuditTeamMembers(),
                a.getAuditeeOwnerId(), a.getAuditSponsorId(),
                a.getMethod() != null ? a.getMethod().name() : null,
                a.getFrequency() != null ? a.getFrequency().name() : null,
                a.getReasonForAudit() != null ? a.getReasonForAudit().name() : null,
                a.getPreviousAuditId(),
                a.isChecklistRequired(), a.isOpeningMeetingRequired(), a.isClosingMeetingRequired(),
                a.isAuditorIndependenceConfirmed(),
                a.getClosureStatus() != null ? a.getClosureStatus().name() : null,
                a.getClosedById(), a.getClosedAt(), a.getClosureComments());
    }

    public static AuditResponse summary(Audit a) {
        return from(a, List.of());
    }
}
