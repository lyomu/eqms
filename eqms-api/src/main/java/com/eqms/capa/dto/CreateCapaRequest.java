package com.eqms.capa.dto;

import java.time.Instant;

import com.eqms.capa.CapaSource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCapaRequest(
        @NotBlank String title,
        @NotNull CapaSource source,
        @NotBlank String description,
        boolean effectivenessCheckRequired,
        Instant dueDate
) {
}
