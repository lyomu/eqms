package com.eqms.materials.dto;

import com.eqms.materials.MaterialType;
import com.eqms.materials.UnitOfMeasure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateMaterialRequest(
        @NotBlank String name,
        @NotNull MaterialType materialType,
        @NotNull UnitOfMeasure unitOfMeasure,
        String specification,
        String description
) {
}
