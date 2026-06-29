package com.eqms.retention.dto;

import com.eqms.retention.RetentionPolicy;

public record RetentionPolicyResponse(
        Long id,
        String recordType,
        int retentionYears,
        String dispositionMethod,
        String legalBasis,
        boolean active,
        int version
) {
    public static RetentionPolicyResponse from(RetentionPolicy policy) {
        return new RetentionPolicyResponse(policy.getId(), policy.getRecordType(), policy.getRetentionYears(),
                policy.getDispositionMethod(), policy.getLegalBasis(), policy.isActive(), policy.getVersion());
    }
}
