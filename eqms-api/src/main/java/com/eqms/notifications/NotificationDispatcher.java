package com.eqms.notifications;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.eqms.identity.User;
import com.eqms.identity.UserRepository;

/**
 * Fire-and-forget async wrapper around {@link NotificationService} and {@link EmailService}.
 * Business flows call this <em>after</em> their transactional action succeeds, so notification
 * dispatch never blocks the user's request nor affects the regulated transaction.
 *
 * <p>Each dispatch method creates the in-app notification and then sends an email to the
 * recipient(s). Email failure is swallowed — it never rolls back or surfaces to the caller.</p>
 *
 * <p>In integration tests the {@code taskExecutor} bean is replaced with a synchronous one, so
 * these methods run inline and are deterministically observable.</p>
 */
@Component
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    public NotificationDispatcher(NotificationService notificationService,
                                   EmailService emailService,
                                   UserRepository userRepository) {
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    /**
     * Notify all active users holding {@code authorityCode} (excluding the actor).
     * Creates an in-app notification and sends an email to each recipient.
     */
    @Async
    public void dispatchToAuthority(String authorityCode, Long excludeUserId, NotificationType type,
                                    String title, String message, String recordType, String recordId) {
        try {
            List<User> recipients = userRepository.findActiveByPermissionCode(authorityCode);
            for (User user : recipients) {
                if (excludeUserId != null && excludeUserId.equals(user.getId())) continue;
                notificationService.create(user.getId(), type, title, message, recordType, recordId);
                emailService.sendNotificationEmail(user.getEmail(), user.getFullName(),
                        "[eQMS] " + title, title, message, recordType, recordId);
            }
        } catch (RuntimeException ex) {
            log.warn("Failed to dispatch '{}' notifications for {} {}: {}", type, recordType, recordId, ex.getMessage());
        }
    }

    /**
     * Notify a single specific user. Creates an in-app notification and sends an email.
     * Use this when the recipient is known directly (e.g. training assigned, document read assigned).
     */
    @Async
    public void dispatchToUser(Long userId, NotificationType type,
                               String title, String message, String recordType, String recordId) {
        try {
            notificationService.create(userId, type, title, message, recordType, recordId);
            userRepository.findById(userId).ifPresent(user ->
                emailService.sendNotificationEmail(user.getEmail(), user.getFullName(),
                        "[eQMS] " + title, title, message, recordType, recordId)
            );
        } catch (RuntimeException ex) {
            log.warn("Failed to dispatch '{}' notification to user {} for {} {}: {}",
                    type, userId, recordType, recordId, ex.getMessage());
        }
    }
}
