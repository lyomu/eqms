package com.eqms.equipment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.eqms.equipment.MaintenanceType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RecordMaintenanceRequest(
        @NotNull LocalDate maintenanceDate,
        @NotNull MaintenanceType maintenanceType,
        @NotBlank String workDescription,
        String performedByName,
        BigDecimal downtimeHours
) {
}
