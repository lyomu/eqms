package com.eqms.batchrecords.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.eqms.batchrecords.BatchQcResult;
import com.eqms.batchrecords.BatchRecord;

public record BatchRecordResponse(
        Long id,
        String batchNo,
        Long productId,
        String productCode,
        BigDecimal batchSize,
        String unit,
        Instant manufacturingStartDate,
        Instant manufacturingEndDate,
        String notes,
        String status,
        int version,
        Long submittedBy,
        Long releasedBy,
        Instant releasedAt,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        List<BatchProductionStepResponse> productionSteps,
        List<QcResultResponse> qcResults
) {
    public record QcResultResponse(
            Long id,
            String testMethod,
            String specificationLimit,
            String actualResult,
            Instant testDate,
            String testStatus,
            String testLab,
            Long approvedBy
    ) {
        public static QcResultResponse from(BatchQcResult r) {
            return new QcResultResponse(r.getId(), r.getTestMethod(), r.getSpecificationLimit(),
                    r.getActualResult(), r.getTestDate(), r.getTestStatus().name(),
                    r.getTestLab(), r.getApprovedBy());
        }
    }

    public static BatchRecordResponse from(BatchRecord b,
                                           List<BatchProductionStepResponse> steps,
                                           List<QcResultResponse> qcResults) {
        return new BatchRecordResponse(
                b.getId(), b.getBatchNo(), b.getProductId(), b.getProductCode(),
                b.getBatchSize(), b.getUnit(),
                b.getManufacturingStartDate(), b.getManufacturingEndDate(),
                b.getNotes(), b.getBatchStatus().name(), b.getVersion(),
                b.getSubmittedBy(), b.getReleasedBy(), b.getReleasedAt(),
                b.getCreatedAt(), b.getCreatedBy(), b.getUpdatedAt(),
                steps, qcResults);
    }

    public static BatchRecordResponse summary(BatchRecord b) {
        return from(b, List.of(), List.of());
    }
}
