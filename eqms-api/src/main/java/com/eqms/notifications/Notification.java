package com.eqms.notifications;

import java.time.Instant;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * An in-app notification for a single recipient. Operational data — deliberately NOT a
 * {@code RegulatedEntity}: it carries no optimistic-lock version and is not audited, but it is
 * soft-deleted (so "delete" never needs a DELETE grant and history is retained). The body carries
 * no sensitive content, only a reference to the source record (CLAUDE.md M10 rule).
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
@SQLDelete(sql = "UPDATE notifications SET deleted_at = now() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "message", columnDefinition = "text")
    private String message;

    /** Source record type (e.g. "Document") — lets the UI deep-link without embedding sensitive data. */
    @Column(name = "record_type", length = 60)
    private String recordType;

    @Column(name = "record_id", length = 40)
    private String recordId;

    @Column(name = "read_at")
    private Instant readAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public boolean isRead() {
        return readAt != null;
    }
}
