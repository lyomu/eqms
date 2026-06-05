package com.eqms.equipment.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

public record ScheduleCalibrationRequest(
        @NotNull Integer expectedVersion,
        @NotNull LocalDate nextCalibrationDate,
        String reason
) {
}
