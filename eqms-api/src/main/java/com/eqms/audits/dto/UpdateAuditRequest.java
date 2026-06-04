package com.eqms.audits.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotNull;

public record UpdateAuditRequest(
        @NotNull Integer expectedVersion,
        String auditTitle,
        String scope,
        Instant auditDate,
        Long auditeeId,
        String reason
) {
}
