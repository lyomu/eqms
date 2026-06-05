package com.eqms.nonconformance.dto;

import java.time.Instant;

public record CreateCapaFromNcRequest(
        String title,
        String description,
        boolean effectivenessCheckRequired,
        Instant dueDate,
        String reason
) {
}
