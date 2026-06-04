package com.eqms.notifications;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.common.ResourceNotFoundException;
import com.eqms.identity.User;
import com.eqms.identity.UserRepository;

/**
 * Creates and manages in-app notifications. All methods here are synchronous and transactional;
 * fire-and-forget dispatch from business flows goes through {@link NotificationDispatcher} (async).
 */
@Service
public class NotificationService {

    private final NotificationRepository repository;
    private final UserRepository userRepository;
    private final Clock clock;

    public NotificationService(NotificationRepository repository, UserRepository userRepository, Clock utcClock) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.clock = utcClock;
    }

    @Transactional
    public Notification create(Long recipientUserId, NotificationType type, String title, String message,
                               String recordType, String recordId) {
        Notification n = new Notification();
        n.setRecipientUserId(recipientUserId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setRecordType(recordType);
        n.setRecordId(recordId);
        return repository.save(n);
    }

    /**
     * Notify every active user holding {@code authorityCode}, optionally excluding one user
     * (e.g. the actor, who should not be told to review their own submission).
     *
     * @return number of notifications created
     */
    @Transactional
    public int notifyUsersWithAuthority(String authorityCode, Long excludeUserId, NotificationType type,
                                        String title, String message, String recordType, String recordId) {
        List<User> recipients = userRepository.findActiveByPermissionCode(authorityCode);
        int created = 0;
        for (User u : recipients) {
            if (excludeUserId != null && excludeUserId.equals(u.getId())) {
                continue;
            }
            create(u.getId(), type, title, message, recordType, recordId);
            created++;
        }
        return created;
    }

    @Transactional(readOnly = true)
    public Page<Notification> list(Long userId, boolean unreadOnly, Pageable pageable) {
        return unreadOnly
                ? repository.findByRecipientUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : repository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByRecipientUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public Notification markRead(Long id, Long userId) {
        Notification n = requireOwned(id, userId);
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now(clock));
        }
        return n;
    }

    @Transactional
    public int markAllRead(Long userId) {
        return repository.markAllReadFor(userId, Instant.now(clock));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        Notification n = requireOwned(id, userId);
        repository.delete(n); // soft delete via @SQLDelete
    }

    private Notification requireOwned(Long id, Long userId) {
        Notification n = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        if (!n.getRecipientUserId().equals(userId)) {
            // Don't disclose existence of another user's notification.
            throw new ResourceNotFoundException("Notification not found: " + id);
        }
        return n;
    }
}
