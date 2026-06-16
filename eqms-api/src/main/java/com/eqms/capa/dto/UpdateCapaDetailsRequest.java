package com.eqms.capa.dto;

import java.time.Instant;

import com.eqms.capa.CapaSource;

public record UpdateCapaDetailsRequest(
        int expectedVersion,
        String reason,
        String title,
        CapaSource source,
        String description,
        Boolean effectivenessCheckRequired,
        Instant dueDate,
        Instant eventDate,
        String priority,
        String aboutType,
        String aboutReference,
        String aboutDetails,
        String partyType,
        String partyFirstName,
        String partyLastName,
        String partyJobTitle,
        String partyCompany,
        String partyEmail,
        String partyPhone,
        String containmentDetails,
        String documentReferences,
        String keywords,
        String rootCause,
        String correctiveActionPlan,
        String preventiveActionPlan,
        Long assignedTo,
        String assignmentStatus,
        String assignmentComment
) {
}
