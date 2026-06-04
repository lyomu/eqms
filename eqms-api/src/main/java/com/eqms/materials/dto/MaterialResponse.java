package com.eqms.materials.dto;

import java.time.Instant;

import com.eqms.materials.Material;

public record MaterialResponse(
        Long id,
        String materialCode,
        String name,
        String materialType,
        String unitOfMeasure,
        String specification,
        String description,
        String status,
        int version,
        Long createdBy,
        Long submittedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static MaterialResponse from(Material m) {
        return new MaterialResponse(
                m.getId(),
                m.getMaterialCode(),
                m.getName(),
                m.getMaterialType().name(),
                m.getUnitOfMeasure().name(),
                m.getSpecification(),
                m.getDescription(),
                m.getMaterialStatus().name(),
                m.getVersion(),
                m.getCreatedBy(),
                m.getSubmittedBy(),
                m.getCreatedAt(),
                m.getUpdatedAt());
    }
}
