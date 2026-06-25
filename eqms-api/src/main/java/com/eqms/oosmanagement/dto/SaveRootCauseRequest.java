package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosRootCauseCategory;
import com.eqms.oosmanagement.OosRootCauseMethod;
public record SaveRootCauseRequest(
    OosRootCauseCategory rootCauseCategory,
    String rootCauseDescription,
    OosRootCauseMethod rootCauseMethod,
    String contributingFactors,
    String immediateCause,
    boolean systematicIssue,
    String recurrencePrevention,
    Long assessedById,
    Long reviewedById,
    int expectedVersion,
    String reason
) {}
