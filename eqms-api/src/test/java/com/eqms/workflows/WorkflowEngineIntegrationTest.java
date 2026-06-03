package com.eqms.workflows;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.eqms.audit.AuditLog;
import com.eqms.audit.AuditService;
import com.eqms.shared.constants.AuditAction;
import com.eqms.support.AbstractIntegrationTest;

/**
 * Proves the shared {@link WorkflowService} enforces the compliance rules: no self-approval (rule 7),
 * the optimistic-lock version check (rule 5), and that a successful transition writes the audit entry
 * in the same transaction (rule 1). Uses an in-memory {@link WorkflowAware} record so the engine can
 * be exercised without coupling to a specific module's table.
 */
class WorkflowEngineIntegrationTest extends AbstractIntegrationTest {

    private static final String RECORD_TYPE = "WorkflowTest";

    private static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder("SUBMIT", "DRAFT", "UNDER_REVIEW").build(),
            WorkflowTransition.builder("APPROVE", "PENDING_APPROVAL", "APPROVED").approval(true).build()
    ));

    @Autowired
    WorkflowService workflowService;

    @Autowired
    AuditService auditService;

    @Test
    void successfulTransitionAppliesStatusAndWritesAudit() {
        TestRecord record = new TestRecord(nextId(), "DRAFT", 0, 100L);

        workflowService.transition(DEFINITION, record,
                TransitionRequest.builder("SUBMIT")
                        .expectedVersion(0)
                        .actingUser(200L, "Bob Submitter")
                        .reason("Ready for review")
                        .build());

        assertThat(record.getStatus()).isEqualTo("UNDER_REVIEW");

        List<AuditLog> trail = auditService.trailFor(RECORD_TYPE, String.valueOf(record.getId()));
        assertThat(trail).hasSize(1);
        assertThat(trail.get(0).getAction()).isEqualTo(AuditAction.STATUS_CHANGE);
        assertThat(trail.get(0).getOldValue()).isEqualTo("DRAFT");
        assertThat(trail.get(0).getNewValue()).isEqualTo("UNDER_REVIEW");
        assertThat(trail.get(0).getReasonForChange()).isEqualTo("Ready for review");
    }

    @Test
    void selfApprovalIsRejectedButAnotherUserCanApprove() {
        Long author = 100L;
        TestRecord record = new TestRecord(nextId(), "PENDING_APPROVAL", 0, author);

        // The author approving their own record is rejected (rule 7).
        assertThatThrownBy(() -> workflowService.transition(DEFINITION, record,
                TransitionRequest.builder("APPROVE")
                        .expectedVersion(0)
                        .actingUser(author, "Same Author")
                        .reason("self approve")
                        .build()))
                .isInstanceOf(SelfApprovalException.class);
        assertThat(record.getStatus()).isEqualTo("PENDING_APPROVAL"); // unchanged

        // A different user can approve.
        workflowService.transition(DEFINITION, record,
                TransitionRequest.builder("APPROVE")
                        .expectedVersion(0)
                        .actingUser(200L, "Independent Approver")
                        .reason("Approved")
                        .build());
        assertThat(record.getStatus()).isEqualTo("APPROVED");
    }

    @Test
    void staleVersionIsRejected() {
        TestRecord record = new TestRecord(nextId(), "DRAFT", 0, 100L);

        assertThatThrownBy(() -> workflowService.transition(DEFINITION, record,
                TransitionRequest.builder("SUBMIT")
                        .expectedVersion(3) // record is at v0
                        .actingUser(200L, "Bob Submitter")
                        .reason("stale")
                        .build()))
                .isInstanceOf(StaleVersionException.class);
        assertThat(record.getStatus()).isEqualTo("DRAFT"); // unchanged
    }

    private static long nextId() {
        return System.nanoTime();
    }

    /** In-memory workflow record for exercising the engine. */
    static final class TestRecord implements WorkflowAware {
        private final Long id;
        private String status;
        private final int version;
        private final Long createdBy;

        TestRecord(long id, String status, int version, Long createdBy) {
            this.id = id;
            this.status = status;
            this.version = version;
            this.createdBy = createdBy;
        }

        @Override public Long getId() { return id; }
        @Override public String getRecordType() { return RECORD_TYPE; }
        @Override public String getStatus() { return status; }
        @Override public void setStatus(String status) { this.status = status; }
        @Override public int getVersion() { return version; }
        @Override public Long getCreatedBy() { return createdBy; }
    }
}
