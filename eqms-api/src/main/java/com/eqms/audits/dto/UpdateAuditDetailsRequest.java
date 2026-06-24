package com.eqms.audits.dto;

import java.time.Instant;

public record UpdateAuditDetailsRequest(
        int expectedVersion,
        String reason,
        String auditTitle,
        String auditType,
        String objective,
        String scope,
        String criteria,
        String category,
        String department,
        String processArea,
        String site,
        String relatedModule,
        String riskLevel,
        Instant plannedStartDate,
        Instant plannedEndDate,
        Long leadAuditorId,
        String auditTeamMembers,
        Long auditeeOwnerId,
        Long auditSponsorId,
        String method,
        String frequency,
        String reasonForAudit,
        Boolean checklistRequired,
        Boolean openingMeetingRequired,
        Boolean closingMeetingRequired,
        Boolean auditorIndependenceConfirmed
) {
}
