package com.eqms.audits.dto;

import java.time.Instant;
import java.time.LocalDate;

public record UpdateMeetingRequest(
        String meetingType,
        Instant meetingDateTime,
        String attendees,
        String agenda,
        String discussionSummary,
        String keyDecisions,
        String agreedActions,
        Boolean minutesApproved,
        Long approvedById,
        LocalDate approvalDate
) {
}
