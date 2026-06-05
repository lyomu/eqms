package com.eqms.equipment.dto;

import jakarta.validation.constraints.NotNull;

public record EquipmentTransitionRequest(
        @NotNull Integer expectedVersion,
        String reason
) {
}
