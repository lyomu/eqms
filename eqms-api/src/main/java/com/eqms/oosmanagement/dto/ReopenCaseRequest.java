package com.eqms.oosmanagement.dto;
import jakarta.validation.constraints.NotBlank;
public record ReopenCaseRequest(
    int expectedVersion,
    @NotBlank String reason,
    String password,
    String totpCode,
    String meaningStatement
) {}
