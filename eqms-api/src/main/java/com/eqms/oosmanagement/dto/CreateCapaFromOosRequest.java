package com.eqms.oosmanagement.dto;

import java.time.LocalDate;

public record CreateCapaFromOosRequest(
        String title,
        String description,
        boolean effectivenessCheckRequired,
        LocalDate dueDate,
        String reason
) {
}
