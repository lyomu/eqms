package com.eqms.suppliers.dto;

import java.time.Instant;

/** Compatibility request for POST /api/suppliers/{id}/schedule-audit. */
public record ScheduleSupplierAuditRequest(
        Instant auditDate,
        String auditor
) {
}
