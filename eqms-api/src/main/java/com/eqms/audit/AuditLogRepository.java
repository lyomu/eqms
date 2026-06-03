package com.eqms.audit;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for the append-only audit trail.
 *
 * <p>Only reads and inserts are exposed/used. The app DB role lacks UPDATE/DELETE on
 * {@code audit_logs} (rule 1), so any attempt to mutate would fail at the database even if
 * called — this interface simply never offers such operations.</p>
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /** Read-only trail for a single record, newest first. */
    List<AuditLog> findByRecordTypeAndRecordIdOrderByUtcTimestampDesc(
            @Param("recordType") String recordType, @Param("recordId") String recordId);
}
