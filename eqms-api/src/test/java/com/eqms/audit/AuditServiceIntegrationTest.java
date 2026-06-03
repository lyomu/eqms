package com.eqms.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.eqms.shared.constants.AuditAction;
import com.eqms.support.AbstractIntegrationTest;

class AuditServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    AuditService auditService;

    @Autowired
    PlatformTransactionManager transactionManager;

    TransactionTemplate tx;

    /** Unique per test method so runs against the shared database never collide. */
    String recordId;

    @BeforeEach
    void setUp() {
        tx = new TransactionTemplate(transactionManager);
        recordId = "DOC-" + UUID.randomUUID();
    }

    @Test
    void writesEntryWithServerUtcTimestampInsideCallerTransaction() {
        Instant before = Instant.now();

        AuditLog saved = tx.execute(status -> auditService.record(AuditEntryRequest.builder()
                .recordType("Document").recordId(recordId)
                .action(AuditAction.CREATE)
                .userId(42L).userFullName("Jane Approver")
                .reasonForChange("Initial creation")
                .ipAddress("10.0.0.5").userAgent("JUnit")
                .build()));

        assertThat(saved.getId()).isNotNull();
        // Timestamp is server-assigned (rule 3), not supplied by the caller.
        assertThat(saved.getUtcTimestamp()).isNotNull();
        assertThat(saved.getUtcTimestamp()).isAfterOrEqualTo(before.minusSeconds(1));

        List<AuditLog> trail = auditService.trailFor("Document", recordId);
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getUserFullName()).isEqualTo("Jane Approver");
        assertThat(trail.get(0).getAction()).isEqualTo(AuditAction.CREATE);
        assertThat(trail.get(0).getReasonForChange()).isEqualTo("Initial creation");
    }

    @Test
    void rejectsCallOutsideTransaction() {
        // Propagation.MANDATORY: the audit entry must share the caller's transaction.
        assertThatThrownBy(() -> auditService.record(AuditEntryRequest.builder()
                .recordType("Document").recordId(recordId)
                .action(AuditAction.UPDATE)
                .userId(1L).userFullName("No Transaction")
                .build()))
                .isInstanceOf(IllegalTransactionStateException.class);

        // Nothing should have been written.
        assertThat(auditService.trailFor("Document", recordId)).isEmpty();
    }

    @Test
    void rollsBackAuditEntryWithBusinessTransaction() {
        try {
            tx.executeWithoutResult(status -> {
                auditService.record(AuditEntryRequest.builder()
                        .recordType("Document").recordId(recordId).action(AuditAction.CREATE)
                        .userId(7L).userFullName("Rollback User").build());
                // Simulate the business change failing after the audit write.
                throw new RuntimeException("business failure");
            });
        } catch (RuntimeException expected) {
            // ignored
        }
        // Because the audit entry shared the caller's transaction, it rolled back too.
        assertThat(auditService.trailFor("Document", recordId)).isEmpty();
    }
}
