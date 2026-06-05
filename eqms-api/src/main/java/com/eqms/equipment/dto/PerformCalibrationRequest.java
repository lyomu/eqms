package com.eqms.equipment.dto;

import java.time.LocalDate;

import com.eqms.equipment.CalibrationResult;

import jakarta.validation.constraints.NotNull;

public record PerformCalibrationRequest(
        @NotNull Integer expectedVersion,
        @NotNull LocalDate calibrationDate,
        @NotNull CalibrationResult result,
        String performedByName,
        LocalDate calibrationDueDate,
        String calibrationCertificatePath,
        String notes,
        String reason
) {
}
