package com.eqms.batchrecords.dto;

import java.time.Instant;

import com.eqms.batchrecords.BatchProductionStep;

public record BatchProductionStepResponse(
        Long id,
        Long batchRecordId,
        Integer stepNumber,
        String stepDescription,
        String equipmentUsed,
        Long operatorId,
        Instant startTime,
        Instant endTime,
        String parametersRecorded,
        String anomaliesNoted,
        Instant createdAt,
        Long createdBy
) {
    public static BatchProductionStepResponse from(BatchProductionStep s) {
        return new BatchProductionStepResponse(
                s.getId(), s.getBatchRecordId(), s.getStepNumber(), s.getStepDescription(),
                s.getEquipmentUsed(), s.getOperatorId(), s.getStartTime(), s.getEndTime(),
                s.getParametersRecorded(), s.getAnomaliesNoted(), s.getCreatedAt(), s.getCreatedBy());
    }
}
