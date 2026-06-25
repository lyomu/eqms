package com.eqms.changecontrol.dto;

import java.time.Instant;
import java.util.List;

import com.eqms.changecontrol.ChangeType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateChangeControlRequest(
        @NotBlank String title,
        @NotNull ChangeType type,
        @NotBlank String description,
        @Size(max = 200) String locationName,
        @Size(max = 200) String purposeOfChange,
        Instant regulatoryMandateEffectiveDate,
        @Size(max = 500) String regulatoryMandateSource,
        @Size(max = 300) String changeCategory,
        @Size(max = 300) String relatedMarket,
        @Size(max = 300) String relatedCustomer,
        @Size(max = 120) String vendorCode,
        @Size(max = 300) String vendorName,
        @Size(max = 120) String productItemCode,
        @Size(max = 500) String productItemDescription,
        @Size(max = 120) String equipmentIdNumber,
        @Size(max = 300) String equipmentName,
        @Size(max = 500) String documentName,
        @Size(max = 120) String documentNumber,
        String currentStatusBrief,
        String proposedChangeBrief,
        String justification,
        @Size(max = 80) String changeNature,
        @Size(max = 500) String temporaryChangePeriod,
        boolean effectivenessCheckRequired,
        Instant targetImplementationDate,
        @Size(max = 200) String changeOwner,
        @Size(max = 200) String changeOwnerHod,
        @Size(max = 200) String qaResponsible,
        List<@Size(max = 200) String> involvedDepartments,
        List<ImpactTaskRequest> impactTasks,
        @Size(max = 80) String radAssessmentRequired,
        @Size(max = 120) String customerCgAssessmentRequired,
        String customerCgComments,
        @Size(max = 200) String qaAssessmentBy,
        Instant qaAssessmentOn,
        @Size(max = 300) String internalCustomer,
        @Size(max = 120) String changeAcceptance,
        String qaComment,
        String recommendations,
        String qpComments,
        @Size(max = 200) String variationClassification,
        String documentsRequestedForFiling,
        String recommendationForRelease,
        String otherRecommendations,
        String radAssessment,
        String otherDepartmentsReview,
        @Size(max = 200) String finalQaDecision,
        Instant qaReviewDate,
        @Size(max = 200) String qaReviewer,
        String implementationDetails,
        String implementationReview,
        String actionConfirmationComment,
        Instant changeEffectiveDate,
        String closureRemarks,
        @Size(max = 200) String batchArNumber,
        @Size(max = 200) String productMaterialCode,
        @Size(max = 400) String productMaterialName,
        @Size(max = 200) String closedByName
) {
    public CreateChangeControlRequest(String title, ChangeType type, String description, String justification,
                                      boolean effectivenessCheckRequired, Instant targetImplementationDate) {
        this(title, type, description, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null,
                justification, null, null, effectivenessCheckRequired, targetImplementationDate, null, null, null,
                List.of(), List.of(), null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null);
    }

    public record ImpactTaskRequest(
            Integer checkpointNo,
            @Size(max = 300) String impactArea,
            @Size(max = 80) String applicability,
            String proposedTask,
            @Size(max = 200) String taskAssignee,
            @Size(max = 500) String remarks
    ) {
    }
}
