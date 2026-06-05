package com.eqms.equipment.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateEquipmentRequest(
        @NotNull Integer expectedVersion,
        String equipmentName,
        String location,
        Long ownerId,
        Integer calibrationFrequencyMonths,
        String reason
) {
}
