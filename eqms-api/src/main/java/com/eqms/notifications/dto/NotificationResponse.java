package com.eqms.notifications.dto;

import java.time.Instant;

import com.eqms.notifications.Notification;

public record NotificationResponse(
        Long id,
        Long recipientUserId,
        String type,
        String title,
        String message,
        String recordType,
        String recordId,
        boolean read,
        Instant readAt,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getRecipientUserId(), n.getType().name(), n.getTitle(), n.getMessage(),
                n.getRecordType(), n.getRecordId(), n.isRead(), n.getReadAt(), n.getCreatedAt());
    }
}
