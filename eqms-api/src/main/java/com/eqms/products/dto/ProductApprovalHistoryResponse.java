package com.eqms.products.dto;

import java.time.Instant;

public record ProductApprovalHistoryResponse(
        Long id,
        String action,
        String fromStatus,
        String toStatus,
        Long actorId,
        String actorName,
        String comment,
        Instant actionAt
) {
}
