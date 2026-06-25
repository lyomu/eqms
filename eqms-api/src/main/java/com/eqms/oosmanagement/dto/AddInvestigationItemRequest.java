package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosInvestigationItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
public record AddInvestigationItemRequest(
    @NotNull OosInvestigationItemType itemType,
    @NotBlank String description,
    String finding,
    String source,
    String evidenceRef,
    Long performedById,
    String performedDate,
    String reason
) {}
