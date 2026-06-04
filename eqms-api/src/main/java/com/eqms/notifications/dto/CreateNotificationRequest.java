package com.eqms.notifications.dto;

import com.eqms.notifications.NotificationType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateNotificationRequest(
        @NotNull Long recipientUserId,
        @NotNull NotificationType type,
        @NotBlank String title,
        String message,
        String recordType,
        String recordId
) {
}
