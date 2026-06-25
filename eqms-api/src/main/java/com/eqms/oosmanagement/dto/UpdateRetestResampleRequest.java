package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosRetestStatus;
public record UpdateRetestResampleRequest(
    String result,
    Boolean resultPass,
    String equipmentUsed,
    String analystComments,
    OosRetestStatus testStatus,
    Long reviewerId,
    String reason
) {}
