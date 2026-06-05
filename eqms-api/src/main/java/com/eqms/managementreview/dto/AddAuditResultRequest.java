package com.eqms.managementreview.dto;

import jakarta.validation.constraints.NotNull;

public record AddAuditResultRequest(
        @NotNull Long auditId,
        Integer criticalFindings,
        Integer majorFindings,
        Integer minorFindings,
        String reason
) {
}
