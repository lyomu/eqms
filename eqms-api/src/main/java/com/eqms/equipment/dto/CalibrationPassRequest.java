package com.eqms.equipment.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record CalibrationPassRequest(
        @NotNull Integer expectedVersion,
        @NotNull LocalDate calibrationDate,
        String performedByName,
        LocalDate calibrationDueDate,
        String calibrationCertificatePath,
        String notes,
        String reason
) {
}
