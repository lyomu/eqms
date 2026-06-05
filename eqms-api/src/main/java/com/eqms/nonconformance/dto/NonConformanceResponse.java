package com.eqms.nonconformance.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.nonconformance.NonConformance;
import com.eqms.nonconformance.NonConformanceDisposition;
import com.eqms.nonconformance.NonConformanceInvestigation;
import com.eqms.nonconformance.NonConformanceUseAsIsApproval;

public record NonConformanceResponse(
        Long id,
        String ncNo,
        String title,
        String description,
        String ncType,
        Long affectedItemId,
        String affectedItemType,
        Instant discoveredDate,
        String discoveredBy,
        Long ownerId,
        String status,
        Long submittedBy,
        Instant closedDate,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        InvestigationDetail investigation,
        DispositionDetail disposition,
        UseAsIsApprovalDetail useAsIsApproval,
        List<Long> linkedCapaIds
) {
    public record InvestigationDetail(
            String investigationFindings,
            String rootCause,
            Long investigatorId,
            Instant investigationDate
    ) {
        public static InvestigationDetail from(NonConformanceInvestigation i) {
            return new InvestigationDetail(i.getInvestigationFindings(), i.getRootCause(),
                    i.getInvestigatorId(), i.getInvestigationDate());
        }
    }

    public record DispositionDetail(
            String disposition,
            String rationale,
            String reworkSpecifications,
            Boolean reworkCompleted,
            Long approvedBy,
            Instant approvedDate
    ) {
        public static DispositionDetail from(NonConformanceDisposition d) {
            return new DispositionDetail(d.getDisposition().name(), d.getRationale(),
                    d.getReworkSpecifications(), d.getReworkCompleted(), d.getApprovedBy(), d.getApprovedDate());
        }
    }

    public record UseAsIsApprovalDetail(
            String useAsIsJustification,
            String riskAssessment,
            Long approvedBy,
            Instant approvedDate
    ) {
        public static UseAsIsApprovalDetail from(NonConformanceUseAsIsApproval a) {
            return new UseAsIsApprovalDetail(a.getUseAsIsJustification(), a.getRiskAssessment(),
                    a.getApprovedBy(), a.getApprovedDate());
        }
    }

    public static NonConformanceResponse from(NonConformance nc,
                                              NonConformanceInvestigation investigation,
                                              NonConformanceDisposition disposition,
                                              NonConformanceUseAsIsApproval useAsIsApproval,
                                              List<Long> linkedCapaIds) {
        return new NonConformanceResponse(
                nc.getId(), nc.getNcNo(), nc.getTitle(), nc.getDescription(), nc.getNcType().name(),
                nc.getAffectedItemId(), nc.getAffectedItemType(), nc.getDiscoveredDate(), nc.getDiscoveredBy(),
                nc.getOwnerId(), nc.getNcStatus().name(), nc.getSubmittedBy(), nc.getClosedDate(),
                nc.getVersion(), nc.getCreatedAt(), nc.getCreatedBy(), nc.getUpdatedAt(),
                investigation == null ? null : InvestigationDetail.from(investigation),
                disposition == null ? null : DispositionDetail.from(disposition),
                useAsIsApproval == null ? null : UseAsIsApprovalDetail.from(useAsIsApproval),
                linkedCapaIds);
    }

    public static NonConformanceResponse summary(NonConformance nc) {
        return from(nc, null, null, null, List.of());
    }
}
