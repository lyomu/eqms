package com.eqms.suppliers.dto;

import java.time.Instant;

import com.eqms.suppliers.SupplierQualification;

public record SupplierQualificationResponse(
        Long id,
        String assessmentMethod,
        Instant assessmentDate,
        String assessor,
        String approvalStatus,
        String notes,
        Instant createdAt
) {
    public static SupplierQualificationResponse from(SupplierQualification q) {
        return new SupplierQualificationResponse(q.getId(), q.getAssessmentMethod(), q.getAssessmentDate(),
                q.getAssessor(), q.getApprovalStatus(), q.getNotes(), q.getCreatedAt());
    }
}
