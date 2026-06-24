package com.eqms.audits.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;

public record CreateMeetingRequest(
        @NotBlank String meetingType,
        Instant meetingDateTime,
        String attendees,
        String agenda,
        String discussionSummary,
        String keyDecisions,
        String agreedActions
) {
}
