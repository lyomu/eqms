package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosInvestigationStatus;
public record SaveInvestigationRequest(
    String investigationScope,
    String investigationPlan,
    OosInvestigationStatus investigationStatus,
    Long investigationOwnerId,
    String investigationTeam,
    String investigationStartDate,
    String investigationDueDate,
    String investigationCompletionDate,
    String investigationFindings,
    String rootCause,
    String rootCauseMethod,
    int expectedVersion,
    String reason
) {}
