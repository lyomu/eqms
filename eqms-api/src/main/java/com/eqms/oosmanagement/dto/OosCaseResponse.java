package com.eqms.oosmanagement.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.eqms.oosmanagement.OosCapaLink;
import com.eqms.oosmanagement.OosCase;
import com.eqms.oosmanagement.OosContainment;
import com.eqms.oosmanagement.OosDispositionRecord;
import com.eqms.oosmanagement.OosEvidence;
import com.eqms.oosmanagement.OosImpactAssessment;
import com.eqms.oosmanagement.OosInitialAssessment;
import com.eqms.oosmanagement.OosInvestigation;
import com.eqms.oosmanagement.OosInvestigationItem;
import com.eqms.oosmanagement.OosLinkedRecord;
import com.eqms.oosmanagement.OosRepeatTesting;
import com.eqms.oosmanagement.OosRetestResample;
import com.eqms.oosmanagement.OosRootCause;

public record OosCaseResponse(
        Long id,
        String oosNo,
        String title,
        String description,
        String recordType,
        String severity,
        String department,
        String lab,
        Instant dateDetected,
        Long detectedById,
        Long ownerId,
        Long qaReviewerId,
        LocalDate dueDate,
        Long productId,
        String testCategory,
        String testName,
        String testMethod,
        BigDecimal specificationLimitMin,
        BigDecimal specificationLimitMax,
        String specificationReference,
        String trendLimit,
        String reportedResult,
        String unitOfMeasure,
        Instant reportedDate,
        Long reportedById,
        String reportedByName,
        String sampleId,
        String sampleType,
        String batchId,
        Long materialId,
        Long materialLotId,
        Long analystId,
        Long reviewerId,
        String equipmentId,
        String calibrationStatusAtTest,
        String reagentUsed,
        String reagentLot,
        String referenceStdLot,
        boolean immediateHoldRequired,
        boolean holdApplied,
        String holdAppliedTo,
        String holdReason,
        String immediateActionTaken,
        boolean productionImpact,
        boolean releasedProductImpact,
        boolean customerImpact,
        boolean regulatoryImpact,
        boolean investigationRequired,
        boolean capaRequired,
        boolean retestRequested,
        boolean resampleRequested,
        String qaDecision,
        String closureComments,
        Long closedById,
        Instant closedDate,
        Long reopenedById,
        Instant reopenedAt,
        String status,
        Long submittedBy,
        int version,
        Instant createdAt,
        Long createdBy,
        Instant updatedAt,
        InitialAssessmentDetail initialAssessment,
        RepeatTestingDetail repeatTesting,
        InvestigationDetail investigation,
        DispositionDetail disposition,
        ContainmentDetail containment,
        List<InvestigationItemDetail> investigationItems,
        List<RetestResampleDetail> retestResample,
        ImpactAssessmentDetail impactAssessment,
        RootCauseDetail rootCause,
        List<LinkedRecordDetail> linkedRecords,
        List<EvidenceDetail> evidence,
        List<Long> linkedCapaIds
) {

    public record InitialAssessmentDetail(
            String assessmentFindings,
            String likelyCause,
            Long assessorId,
            Instant assessmentDate,
            Long labSupervisorId,
            String labSupervisorReview,
            String assessmentOutcome,
            String labErrorDescription,
            Instant assessmentStartedDate,
            Instant assessmentCompletedDate,
            String assessmentComments,
            Boolean labErrorSuspected,
            Boolean correctSampleTested,
            Boolean correctTestMethodUsed,
            Boolean correctSpecificationApplied,
            Boolean calculationsChecked,
            Boolean dilutionsChecked,
            Boolean systemSuitabilityChecked,
            Boolean instrumentCalibrationValid,
            Boolean instrumentPerformanceAcceptable,
            Boolean reagentsStandardsValid,
            Boolean analystFollowedProcedure,
            Boolean environmentalConditionsAcceptable,
            Boolean samplePreparationChecked,
            Boolean rawDataReviewed,
            Boolean transcriptionChecked,
            Boolean previousResultsReviewed
    ) {
        public static InitialAssessmentDetail from(OosInitialAssessment a) {
            return new InitialAssessmentDetail(
                    a.getAssessmentFindings(),
                    a.getLikelyCause() == null ? null : a.getLikelyCause().name(),
                    a.getAssessorId(), a.getAssessmentDate(),
                    a.getLabSupervisorId(), a.getLabSupervisorReview(),
                    a.getAssessmentOutcome() == null ? null : a.getAssessmentOutcome().name(),
                    a.getLabErrorDescription(), a.getAssessmentStartedDate(), a.getAssessmentCompletedDate(),
                    a.getAssessmentComments(), a.getLabErrorSuspected(),
                    a.getCorrectSampleTested(), a.getCorrectTestMethodUsed(), a.getCorrectSpecificationApplied(),
                    a.getCalculationsChecked(), a.getDilutionsChecked(), a.getSystemSuitabilityChecked(),
                    a.getInstrumentCalibrationValid(), a.getInstrumentPerformanceAcceptable(),
                    a.getReagentsStandardsValid(), a.getAnalystFollowedProcedure(),
                    a.getEnvironmentalConditionsAcceptable(), a.getSamplePreparationChecked(),
                    a.getRawDataReviewed(), a.getTranscriptionChecked(), a.getPreviousResultsReviewed());
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
            String investigationScope,
            String investigationPlan,
            String investigationStatus,
            Long investigationOwnerId,
            String investigationTeam,
            Instant investigationStartDate,
            Instant investigationDueDate,
            Instant investigationCompletionDate,
            String investigationFindings,
            String rootCause,
            String rootCauseMethod,
            Long investigatorId,
            Instant investigationDate
    ) {
        public static InvestigationDetail from(OosInvestigation i) {
            return new InvestigationDetail(
                    i.getInvestigationScope(), i.getInvestigationPlan(),
                    i.getInvestigationStatus() == null ? null : i.getInvestigationStatus().name(),
                    i.getInvestigationOwnerId(), i.getInvestigationTeam(),
                    i.getInvestigationStartDate(), i.getInvestigationDueDate(), i.getInvestigationCompletionDate(),
                    i.getInvestigationFindings(), i.getRootCause(), i.getRootCauseMethod(),
                    i.getInvestigatorId(), i.getInvestigationDate());
        }
    }

    public record DispositionDetail(
            String disposition,
            String rationale,
            String qaDecision,
            String finalConclusion,
            BigDecimal dispositionQuantity,
            String affectedLots,
            String conditionsOfRelease,
            String closureComments,
            Long approvedBy,
            Instant approvedDate,
            Long closedById
    ) {
        public static DispositionDetail from(OosDispositionRecord d) {
            return new DispositionDetail(
                    d.getDisposition().name(), d.getRationale(),
                    d.getQaDecision() == null ? null : d.getQaDecision().name(),
                    d.getFinalConclusion(), d.getDispositionQuantity(), d.getAffectedLots(),
                    d.getConditionsOfRelease(), d.getClosureComments(),
                    d.getApprovedBy(), d.getApprovedDate(), d.getClosedById());
        }
    }

    public record ContainmentDetail(
            Long id,
            boolean holdRequired,
            String holdType,
            String holdTarget,
            String targetReference,
            String holdReason,
            Instant holdAppliedAt,
            Long holdAppliedBy,
            Instant holdReleasedAt,
            Long holdReleasedBy,
            String immediateActions,
            boolean notificationIssued,
            boolean regulatoryNotificationRequired,
            boolean customerNotificationRequired,
            String notes,
            String containmentStatus
    ) {
        public static ContainmentDetail from(OosContainment c) {
            return new ContainmentDetail(
                    c.getId(), c.isHoldRequired(), c.getHoldType(),
                    c.getHoldTarget() == null ? null : c.getHoldTarget().name(),
                    c.getTargetReference(), c.getHoldReason(),
                    c.getHoldAppliedAt(), c.getHoldAppliedBy(), c.getHoldReleasedAt(), c.getHoldReleasedBy(),
                    c.getImmediateActions(), c.isNotificationIssued(),
                    c.isRegulatoryNotificationRequired(), c.isCustomerNotificationRequired(),
                    c.getNotes(), c.getContainmentStatus().name());
        }
    }

    public record InvestigationItemDetail(
            Long id,
            String itemType,
            int itemNumber,
            String description,
            String finding,
            String source,
            String evidenceRef,
            Long performedById,
            Instant performedDate,
            String itemStatus
    ) {
        public static InvestigationItemDetail from(OosInvestigationItem i) {
            return new InvestigationItemDetail(
                    i.getId(),
                    i.getItemType() == null ? null : i.getItemType().name(),
                    i.getItemNumber(), i.getDescription(), i.getFinding(),
                    i.getSource(), i.getEvidenceRef(), i.getPerformedById(), i.getPerformedDate(),
                    i.getItemStatus() == null ? null : i.getItemStatus().name());
        }
    }

    public record RetestResampleDetail(
            Long id,
            String testType,
            int testNumber,
            Long orderedById,
            Instant orderedDate,
            String rationale,
            String sampleReference,
            Long analystId,
            Instant performedDate,
            String result,
            Boolean resultPass,
            String equipmentUsed,
            String analystComments,
            Long reviewerId,
            Instant reviewedDate,
            String testStatus
    ) {
        public static RetestResampleDetail from(OosRetestResample r) {
            return new RetestResampleDetail(
                    r.getId(),
                    r.getTestType() == null ? null : r.getTestType().name(),
                    r.getTestNumber(), r.getOrderedById(), r.getOrderedDate(),
                    r.getRationale(), r.getSampleReference(), r.getAnalystId(), r.getPerformedDate(),
                    r.getResult(), r.getResultPass(), r.getEquipmentUsed(), r.getAnalystComments(),
                    r.getReviewerId(), r.getReviewedDate(),
                    r.getTestStatus() == null ? null : r.getTestStatus().name());
        }
    }

    public record ImpactAssessmentDetail(
            Long id,
            String scopeOfImpact,
            String batchesPotentiallyAffected,
            String productsPotentiallyAffected,
            boolean releasedProductImpact,
            boolean customerImpact,
            boolean regulatoryImpact,
            String patientSafetyRisk,
            String riskJustification,
            boolean quarantineRequired,
            boolean recallRequired,
            boolean authorityNotificationRequired,
            Instant authorityNotifiedAt,
            Long authorityNotifiedBy,
            Long assessedById,
            Instant assessedDate
    ) {
        public static ImpactAssessmentDetail from(OosImpactAssessment i) {
            return new ImpactAssessmentDetail(
                    i.getId(), i.getScopeOfImpact(), i.getBatchesPotentiallyAffected(),
                    i.getProductsPotentiallyAffected(), i.isReleasedProductImpact(),
                    i.isCustomerImpact(), i.isRegulatoryImpact(),
                    i.getPatientSafetyRisk() == null ? null : i.getPatientSafetyRisk().name(),
                    i.getRiskJustification(), i.isQuarantineRequired(), i.isRecallRequired(),
                    i.isAuthorityNotificationRequired(), i.getAuthorityNotifiedAt(), i.getAuthorityNotifiedBy(),
                    i.getAssessedById(), i.getAssessedDate());
        }
    }

    public record RootCauseDetail(
            Long id,
            String rootCauseCategory,
            String rootCauseDescription,
            String rootCauseMethod,
            String contributingFactors,
            String immediateCause,
            boolean systematicIssue,
            String recurrencePrevention,
            Long assessedById,
            Instant assessedDate,
            Long reviewedById,
            Instant reviewedDate
    ) {
        public static RootCauseDetail from(OosRootCause r) {
            return new RootCauseDetail(
                    r.getId(),
                    r.getRootCauseCategory() == null ? null : r.getRootCauseCategory().name(),
                    r.getRootCauseDescription(),
                    r.getRootCauseMethod() == null ? null : r.getRootCauseMethod().name(),
                    r.getContributingFactors(), r.getImmediateCause(), r.isSystematicIssue(),
                    r.getRecurrencePrevention(), r.getAssessedById(), r.getAssessedDate(),
                    r.getReviewedById(), r.getReviewedDate());
        }
    }

    public record LinkedRecordDetail(
            Long id,
            String linkedRecordType,
            String linkedRecordId,
            String linkedRecordReference,
            String linkedRecordTitle,
            String linkedRecordStatus,
            String relationshipType,
            String notes,
            Long addedBy,
            Instant createdAt
    ) {
        public static LinkedRecordDetail from(OosLinkedRecord r) {
            return new LinkedRecordDetail(
                    r.getId(),
                    r.getLinkedRecordType() == null ? null : r.getLinkedRecordType().name(),
                    r.getLinkedRecordId(), r.getLinkedRecordReference(), r.getLinkedRecordTitle(),
                    r.getLinkedRecordStatus(), r.getRelationshipType(), r.getNotes(),
                    r.getAddedBy(), r.getCreatedAt());
        }
    }

    public record EvidenceDetail(
            Long id,
            String evidenceType,
            int evidenceNumber,
            String title,
            String description,
            String fileName,
            Long fileSize,
            String contentType,
            Long attachmentId,
            Long submittedBy,
            Instant submittedDate,
            String evidenceStatus,
            Long reviewedBy,
            Instant reviewedDate
    ) {
        public static EvidenceDetail from(OosEvidence e) {
            return new EvidenceDetail(
                    e.getId(),
                    e.getEvidenceType() == null ? null : e.getEvidenceType().name(),
                    e.getEvidenceNumber(), e.getTitle(), e.getDescription(), e.getFileName(),
                    e.getFileSize(), e.getContentType(), e.getAttachmentId(),
                    e.getSubmittedBy(), e.getSubmittedDate(),
                    e.getEvidenceStatus() == null ? null : e.getEvidenceStatus().name(),
                    e.getReviewedBy(), e.getReviewedDate());
        }
    }

    public static OosCaseResponse from(OosCase c,
                                       OosInitialAssessment assessment,
                                       OosRepeatTesting repeatTesting,
                                       OosInvestigation investigation,
                                       OosDispositionRecord disposition,
                                       OosContainment containment,
                                       List<OosInvestigationItem> investigationItems,
                                       List<OosRetestResample> retestResample,
                                       OosImpactAssessment impactAssessment,
                                       OosRootCause rootCause,
                                       List<OosLinkedRecord> linkedRecords,
                                       List<OosEvidence> evidence,
                                       List<Long> linkedCapaIds) {
        return new OosCaseResponse(
                c.getId(), c.getOosNo(), c.getTitle(), c.getDescription(),
                c.getRecordTypeField() == null ? null : c.getRecordTypeField().name(),
                c.getSeverity() == null ? null : c.getSeverity().name(),
                c.getDepartment(), c.getLab(), c.getDateDetected(), c.getDetectedById(),
                c.getOwnerId(), c.getQaReviewerId(), c.getDueDate(), c.getProductId(),
                c.getTestCategory() == null ? null : c.getTestCategory().name(),
                c.getTestName(), c.getTestMethod(),
                c.getSpecificationLimitMin(), c.getSpecificationLimitMax(),
                c.getSpecificationReference(), c.getTrendLimit(), c.getReportedResult(),
                c.getUnitOfMeasure(), c.getReportedDate(), c.getReportedById(), c.getReportedByName(),
                c.getSampleId(),
                c.getSampleType() == null ? null : c.getSampleType().name(),
                c.getBatchId(), c.getMaterialId(), c.getMaterialLotId(),
                c.getAnalystId(), c.getReviewerId(), c.getEquipmentId(), c.getCalibrationStatusAtTest(),
                c.getReagentUsed(), c.getReagentLot(), c.getReferenceStdLot(),
                c.isImmediateHoldRequired(), c.isHoldApplied(),
                c.getHoldAppliedTo() == null ? null : c.getHoldAppliedTo().name(),
                c.getHoldReason(), c.getImmediateActionTaken(),
                c.isProductionImpact(), c.isReleasedProductImpact(),
                c.isCustomerImpact(), c.isRegulatoryImpact(),
                c.isInvestigationRequired(), c.isCapaRequired(),
                c.isRetestRequested(), c.isResampleRequested(),
                c.getQaDecision() == null ? null : c.getQaDecision().name(),
                c.getClosureComments(), c.getClosedById(), c.getClosedDate(),
                c.getReopenedById(), c.getReopenedAt(),
                c.getOosStatus().name(), c.getSubmittedBy(),
                c.getVersion(), c.getCreatedAt(), c.getCreatedBy(), c.getUpdatedAt(),
                assessment == null ? null : InitialAssessmentDetail.from(assessment),
                repeatTesting == null ? null : RepeatTestingDetail.from(repeatTesting),
                investigation == null ? null : InvestigationDetail.from(investigation),
                disposition == null ? null : DispositionDetail.from(disposition),
                containment == null ? null : ContainmentDetail.from(containment),
                investigationItems == null ? List.of() : investigationItems.stream().map(InvestigationItemDetail::from).toList(),
                retestResample == null ? List.of() : retestResample.stream().map(RetestResampleDetail::from).toList(),
                impactAssessment == null ? null : ImpactAssessmentDetail.from(impactAssessment),
                rootCause == null ? null : RootCauseDetail.from(rootCause),
                linkedRecords == null ? List.of() : linkedRecords.stream().map(LinkedRecordDetail::from).toList(),
                evidence == null ? List.of() : evidence.stream().map(EvidenceDetail::from).toList(),
                linkedCapaIds);
    }

    public static OosCaseResponse summary(OosCase c) {
        return from(c, null, null, null, null, null, List.of(), List.of(), null, null, List.of(), List.of(), List.of());
    }
}
