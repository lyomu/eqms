package com.eqms.audits.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Define the audit plan (scope, auditee, date) and begin fieldwork (PLANNED -> IN_PROGRESS). */
public record PlanAuditRequest(
        @NotNull Integer expectedVersion,
        @NotBlank String scope,
        Long auditeeId,
        Instant auditDate,
        String reason
) {
}
