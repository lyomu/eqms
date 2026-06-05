package com.eqms.managementreview.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.eqms.managementreview.ReviewActionItem;

public record ActionItemResponse(
        Long id,
        Long managementReviewId,
        String actionDescription,
        Long ownerId,
        LocalDate dueDate,
        String status,
        Instant completionDate
) {
    public static ActionItemResponse from(ReviewActionItem item) {
        return new ActionItemResponse(item.getId(), item.getManagementReviewId(), item.getActionDescription(),
                item.getOwnerId(), item.getDueDate(), item.getStatus().name(), item.getCompletionDate());
    }
}
