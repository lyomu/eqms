package com.eqms.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Fire-and-forget async wrapper around {@link NotificationService}. Business flows (e.g. document
 * submission) call this <em>after</em> their transactional action succeeds, so notification
 * dispatch never blocks the user's request nor affects the regulated transaction.
 *
 * <p>In integration tests the {@code taskExecutor} bean is replaced with a synchronous one, so these
 * methods run inline and are deterministically observable.</p>
 */
@Component
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    private final NotificationService notificationService;

    public NotificationDispatcher(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Async
    public void dispatchToAuthority(String authorityCode, Long excludeUserId, NotificationType type,
                                    String title, String message, String recordType, String recordId) {
        try {
            notificationService.notifyUsersWithAuthority(authorityCode, excludeUserId, type, title, message,
                    recordType, recordId);
        } catch (RuntimeException ex) {
            // Never let a notification failure surface to (or roll back) the business action.
            log.warn("Failed to dispatch '{}' notifications for {} {}: {}", type, recordType, recordId, ex.getMessage());
        }
    }
}
