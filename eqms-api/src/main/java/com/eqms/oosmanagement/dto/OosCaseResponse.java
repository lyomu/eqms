package com.eqms.oosmanagement.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.eqms.oosmanagement.OosCapaLink;
import com.eqms.oosmanagement.OosCase;
import com.eqms.oosmanagement.OosDispositionRecord;
import com.eqms.oosmanagement.OosInitialAssessment;
import com.eqms.oosmanagement.OosInvestigation;
import com.eqms.oosmanagement.OosRepeatTesting;

public record OosCaseResponse(
        Long id,
        String oosNo,
        Long productId,
        String testMethod,
        BigDecimal specificationLimitMin,
        BigDecimal specificationLimitMax,
        String reportedResult,
        Instant reportedDate,
        Long reportedById,
        String reportedByName,
        String status,
        Long submittedBy,
        Instant closedDate,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        InitialAssessmentDetail initialAssessment,
        RepeatTestingDetail repeatTesting,
        InvestigationDetail investigation,
        DispositionDetail disposition,
        List<Long> linkedCapaIds
) {
    public record InitialAssessmentDetail(
            String assessmentFindings,
            String likelyCause,
            Long assessorId,
            Instant assessmentDate
    ) {
        public static InitialAssessmentDetail from(OosInitialAssessment a) {
            return new InitialAssessmentDetail(a.getAssessmentFindings(),
                    a.getLikelyCause() == null ? null : a.getLikelyCause().name(),
                    a.getAssessorId(), a.getAssessmentDate());
        }
    }

    public record RepeatTestingDetail(
            Instant repeatOrderedDate,
            String repeatResult,
            Instant repeatTestDate,
            Long testTechnicianId,
            String testTechnicianName,
            String notes
    ) {
        public static RepeatTestingDetail from(OosRepeatTesting r) {
            return new RepeatTestingDetail(r.getRepeatOrderedDate(),
                    r.getRepeatResult() == null ? null : r.getRepeatResult().name(),
                    r.getRepeatTestDate(), r.getTestTechnicianId(), r.getTestTechnicianName(), r.getNotes());
        }
    }

    public record InvestigationDetail(
            String investigationFindings,
            String rootCause,
            String rootCauseMethod,
            Long investigatorId,
            Instant investigationDate
    ) {
        public static InvestigationDetail from(OosInvestigation i) {
            return new InvestigationDetail(i.getInvestigationFindings(), i.getRootCause(),
                    i.getRootCauseMethod(), i.getInvestigatorId(), i.getInvestigationDate());
        }
    }

    public record DispositionDetail(
            String disposition,
            String rationale,
            Long approvedBy,
            Instant approvedDate
    ) {
        public static DispositionDetail from(OosDispositionRecord d) {
            return new DispositionDetail(d.getDisposition().name(), d.getRationale(),
                    d.getApprovedBy(), d.getApprovedDate());
        }
    }

    public static OosCaseResponse from(OosCase c, OosInitialAssessment assessment,
                                       OosRepeatTesting repeatTesting, OosInvestigation investigation,
                                       OosDispositionRecord disposition, List<Long> linkedCapaIds) {
        return new OosCaseResponse(
                c.getId(), c.getOosNo(), c.getProductId(), c.getTestMethod(),
                c.getSpecificationLimitMin(), c.getSpecificationLimitMax(),
                c.getReportedResult(), c.getReportedDate(), c.getReportedById(), c.getReportedByName(),
                c.getOosStatus().name(), c.getSubmittedBy(), c.getClosedDate(),
                c.getVersion(), c.getCreatedAt(), c.getCreatedBy(), c.getUpdatedAt(),
                assessment == null ? null : InitialAssessmentDetail.from(assessment),
                repeatTesting == null ? null : RepeatTestingDetail.from(repeatTesting),
                investigation == null ? null : InvestigationDetail.from(investigation),
                disposition == null ? null : DispositionDetail.from(disposition),
                linkedCapaIds);
    }

    public static OosCaseResponse summary(OosCase c) {
        return from(c, null, null, null, null, List.of());
    }
}
