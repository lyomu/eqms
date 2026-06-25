package com.eqms.oosmanagement.dto;
import com.eqms.oosmanagement.OosInvestigationItemStatus;
public record UpdateInvestigationItemRequest(
    String description,
    String finding,
    String source,
    String evidenceRef,
    OosInvestigationItemStatus itemStatus,
    String performedDate,
    String reason
) {}
