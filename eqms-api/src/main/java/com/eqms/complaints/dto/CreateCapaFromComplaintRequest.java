package com.eqms.complaints.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;

/** Create a new CAPA (source = COMPLAINT) from a complaint and link it. */
public record CreateCapaFromComplaintRequest(
        String title,
        @NotBlank String description,
        boolean effectivenessCheckRequired,
        Instant dueDate,
        String reason
) {
}
