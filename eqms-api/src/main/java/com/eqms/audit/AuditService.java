package com.eqms.audit;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.eqms.shared.constants.AuditAction;

/**
 * Writes append-only audit-trail entries (CLAUDE.md compliance rule 1).
 *
 * <p><b>Same-transaction guarantee:</b> {@link #record(AuditEntryRequest)} uses
 * {@link Propagation#MANDATORY}, so it can only run inside an existing transaction — i.e. the
 * caller's {@code @Transactional} block that performs the business change. The audit entry and
 * the business change therefore commit or roll back together; an audit entry can never be left
 * orphaned, and a business change can never commit without its audit entry.</p>
 *
 * <p><b>Server time:</b> the UTC timestamp is taken here from the injected {@link Clock}
 * (rule 3); the caller cannot supply it.</p>
 */
@Service
public class AuditService {

    private final AuditLogRepository repository;
    private final Clock clock;

    public AuditService(AuditLogRepository repository, Clock utcClock) {
        this.repository = repository;
        this.clock = utcClock;
    }

    /**
     * Persist one audit entry within the caller's transaction.
     *
     * @return the persisted entry (including its server-assigned UTC timestamp and id)
     * @throws org.springframework.transaction.IllegalTransactionStateException if called outside a transaction
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public AuditLog record(AuditEntryRequest request) {
        Objects.requireNonNull(request, "audit request must not be null");
        Objects.requireNonNull(request.recordType(), "recordType is required");
        Objects.requireNonNull(request.recordId(), "recordId is required");
        Objects.requireNonNull(request.action(), "action is required");
        Objects.requireNonNull(request.userId(), "userId is required");
        Objects.requireNonNull(request.userFullName(), "userFullName is required");

        AuditLog entry = AuditLog.builder()
                .recordType(request.recordType())
                .recordId(request.recordId())
                .action(request.action())
                .fieldName(request.fieldName())
                .oldValue(request.oldValue())
                .newValue(request.newValue())
                .reasonForChange(request.reasonForChange())
                .userId(request.userId())
                .userFullName(request.userFullName())
                .utcTimestamp(Instant.now(clock))   // server-side UTC, never client-supplied
                .ipAddress(request.ipAddress())
                .userAgent(request.userAgent())
                .build();

        return repository.save(entry);
    }

    /** Read-only trail for a single record, newest first (rule 1 — read access for viewers). */
    @Transactional(readOnly = true)
    public List<AuditLog> trailFor(String recordType, String recordId) {
        return repository.findByRecordTypeAndRecordIdOrderByUtcTimestampDesc(recordType, recordId);
    }

    /** Convenience overload for the common record-level (non field-level) action. */
    @Transactional(propagation = Propagation.MANDATORY)
    public AuditLog record(String recordType, String recordId, AuditAction action,
                           Long userId, String userFullName, String reasonForChange) {
        return record(AuditEntryRequest.builder()
                .recordType(recordType).recordId(recordId).action(action)
                .userId(userId).userFullName(userFullName).reasonForChange(reasonForChange)
                .build());
    }
}
