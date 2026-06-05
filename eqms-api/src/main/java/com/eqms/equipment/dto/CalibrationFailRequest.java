package com.eqms.equipment.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record CalibrationFailRequest(
        @NotNull Integer expectedVersion,
        @NotNull LocalDate calibrationDate,
        String performedByName,
        LocalDate calibrationDueDate,
        String calibrationCertificatePath,
        @NotNull String notes,
        String reason
) {
}
