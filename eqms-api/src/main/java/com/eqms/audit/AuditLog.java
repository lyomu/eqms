package com.eqms.audit;

import java.time.Instant;

import org.hibernate.annotations.Immutable;

import com.eqms.shared.constants.AuditAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

/**
 * An append-only audit trail entry (CLAUDE.md compliance rule 1).
 *
 * <p>This entity is deliberately:
 * <ul>
 *   <li><b>{@code @Immutable}</b> — Hibernate will never issue UPDATE for it;</li>
 *   <li>without a {@code version} or {@code deleted_at} column — it is never updated or deleted.</li>
 * </ul>
 * The database reinforces this independently: the app role holds only INSERT+SELECT on
 * {@code audit_logs}, and a {@code BEFORE UPDATE/DELETE} trigger raises an exception. The
 * object is therefore write-once. Build instances via {@link #builder()}.</p>
 */
@Entity
@Table(name = "audit_logs")
@Immutable
@Getter
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Logical record type, e.g. "Document", "ChangeControl". */
    @Column(name = "record_type", nullable = false, length = 80, updatable = false)
    private String recordType;

    /** Business identifier of the affected record (string to stay type-agnostic across modules). */
    @Column(name = "record_id", nullable = false, length = 80, updatable = false)
    private String recordId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 40, updatable = false)
    private AuditAction action;

    /** For field-level changes: the field that changed (null for record-level actions). */
    @Column(name = "field_name", length = 120, updatable = false)
    private String fieldName;

    @Column(name = "old_value", columnDefinition = "text", updatable = false)
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "text", updatable = false)
    private String newValue;

    @Column(name = "reason_for_change", columnDefinition = "text", updatable = false)
    private String reasonForChange;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    /** Snapshot of the user's full name at the time of the action. */
    @Column(name = "user_full_name", nullable = false, length = 200, updatable = false)
    private String userFullName;

    /** Server-side UTC timestamp (rule 3). Set by {@code AuditService}, never by the client. */
    @Column(name = "utc_timestamp", nullable = false, updatable = false)
    private Instant utcTimestamp;

    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "text", updatable = false)
    private String userAgent;

    protected AuditLog() {
        // for JPA
    }

    private AuditLog(Builder b) {
        this.recordType = b.recordType;
        this.recordId = b.recordId;
        this.action = b.action;
        this.fieldName = b.fieldName;
        this.oldValue = b.oldValue;
        this.newValue = b.newValue;
        this.reasonForChange = b.reasonForChange;
        this.userId = b.userId;
        this.userFullName = b.userFullName;
        this.utcTimestamp = b.utcTimestamp;
        this.ipAddress = b.ipAddress;
        this.userAgent = b.userAgent;
    }

    public static Builder builder() {
        return new Builder();
    }

    /** Minimal builder; {@code AuditService} is the only intended caller. */
    public static final class Builder {
        private String recordType;
        private String recordId;
        private AuditAction action;
        private String fieldName;
        private String oldValue;
        private String newValue;
        private String reasonForChange;
        private Long userId;
        private String userFullName;
        private Instant utcTimestamp;
        private String ipAddress;
        private String userAgent;

        public Builder recordType(String v) { this.recordType = v; return this; }
        public Builder recordId(String v) { this.recordId = v; return this; }
        public Builder action(AuditAction v) { this.action = v; return this; }
        public Builder fieldName(String v) { this.fieldName = v; return this; }
        public Builder oldValue(String v) { this.oldValue = v; return this; }
        public Builder newValue(String v) { this.newValue = v; return this; }
        public Builder reasonForChange(String v) { this.reasonForChange = v; return this; }
        public Builder userId(Long v) { this.userId = v; return this; }
        public Builder userFullName(String v) { this.userFullName = v; return this; }
        public Builder utcTimestamp(Instant v) { this.utcTimestamp = v; return this; }
        public Builder ipAddress(String v) { this.ipAddress = v; return this; }
        public Builder userAgent(String v) { this.userAgent = v; return this; }

        public AuditLog build() {
            return new AuditLog(this);
        }
    }
}
