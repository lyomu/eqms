package com.eqms.audits.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.audits.AuditMeeting;

public record AuditMeetingResponse(
        Long id,
        Long auditId,
        String meetingType,
        Instant meetingDateTime,
        String attendees,
        String agenda,
        String discussionSummary,
        String keyDecisions,
        String agreedActions,
        boolean minutesApproved,
        Long approvedById,
        LocalDate approvalDate,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        Long updatedBy
) {
    public static AuditMeetingResponse from(AuditMeeting m) {
        return new AuditMeetingResponse(
                m.getId(), m.getAuditId(),
                m.getMeetingType() != null ? m.getMeetingType().name() : null,
                m.getMeetingDateTime(), m.getAttendees(), m.getAgenda(),
                m.getDiscussionSummary(), m.getKeyDecisions(), m.getAgreedActions(),
                m.isMinutesApproved(), m.getApprovedById(), m.getApprovalDate(),
                m.getCreatedAt(), m.getCreatedBy(),
                m.getUpdatedAt(), m.getUpdatedBy());
    }
}
