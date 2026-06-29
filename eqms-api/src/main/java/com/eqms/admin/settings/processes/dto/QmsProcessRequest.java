package com.eqms.admin.settings.processes.dto;

import java.time.LocalDate;

import com.eqms.admin.settings.processes.QmsProcessStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record QmsProcessRequest(
        @NotBlank @Size(max = 240) String name,
        Long processOwnerId,
        @Size(max = 160) String department,
        String purpose,
        String inputs,
        String outputs,
        String kpis,
        String linkedDocuments,
        String linkedRisks,
        String linkedTraining,
        String recordsGenerated,
        @Positive Integer reviewFrequencyMonths,
        LocalDate nextReviewDate,
        QmsProcessStatus status,
        Integer expectedVersion,
        String reason
) {
}
