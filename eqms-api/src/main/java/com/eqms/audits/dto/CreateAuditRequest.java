package com.eqms.audits.dto;

import java.time.Instant;

import com.eqms.audits.AuditType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateAuditRequest(
        @NotBlank String auditTitle,
        @NotNull AuditType auditType,
        @NotBlank String scope,
        Instant auditDate,
        Long auditeeId
) {
}
