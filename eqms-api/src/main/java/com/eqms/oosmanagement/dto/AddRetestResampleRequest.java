package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosRetestType;
import jakarta.validation.constraints.NotNull;
public record AddRetestResampleRequest(
    @NotNull OosRetestType testType,
    String rationale,
    String sampleReference,
    int expectedVersion,
    String reason
) {}
