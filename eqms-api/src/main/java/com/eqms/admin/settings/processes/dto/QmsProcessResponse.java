package com.eqms.admin.settings.processes.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.admin.settings.processes.QmsProcess;
import com.eqms.admin.settings.processes.QmsProcessStatus;

public record QmsProcessResponse(
        Long id,
        String processCode,
        String name,
        Long processOwnerId,
        String department,
        String purpose,
        String inputs,
        String outputs,
        String kpis,
        String linkedDocuments,
        String linkedRisks,
        String linkedTraining,
        String recordsGenerated,
        int reviewFrequencyMonths,
        LocalDate nextReviewDate,
        QmsProcessStatus status,
        int version,
        Instant createdAt,
        Instant updatedAt
) {
    public static QmsProcessResponse from(QmsProcess p) {
        return new QmsProcessResponse(p.getId(), p.getProcessCode(), p.getName(), p.getProcessOwnerId(),
                p.getDepartment(), p.getPurpose(), p.getInputs(), p.getOutputs(), p.getKpis(),
                p.getLinkedDocuments(), p.getLinkedRisks(), p.getLinkedTraining(), p.getRecordsGenerated(),
                p.getReviewFrequencyMonths(), p.getNextReviewDate(), p.getStatus(), p.getVersion(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}
