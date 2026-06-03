package com.eqms.changecontrol.dto;

import java.time.Instant;

import com.eqms.changecontrol.ChangeType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateChangeControlRequest(
        @NotBlank String title,
        @NotNull ChangeType type,
        @NotBlank String description,
        String justification,
        boolean effectivenessCheckRequired,
        Instant targetImplementationDate
) {
}
