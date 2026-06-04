package com.eqms.batchrecords.dto;

import java.time.Instant;

import com.eqms.batchrecords.QcTestStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LinkQcTestRequest(
        @NotBlank String testMethod,
        @NotBlank String specificationLimit,
        @NotBlank String actualResult,
        @NotNull Instant testDate,
        @NotNull QcTestStatus testStatus,
        String testLab,
        Long approvedBy
) {
}
