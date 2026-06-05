package com.eqms.equipment.dto;

import java.time.LocalDate;

import com.eqms.equipment.EquipmentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateEquipmentRequest(
        @NotBlank String equipmentName,
        @NotNull EquipmentType equipmentType,
        @NotBlank String manufacturer,
        String model,
        String serialNumber,
        String location,
        LocalDate acquisitionDate,
        Integer calibrationFrequencyMonths
) {
}
