package com.eqms.batchrecords;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Electronic Batch Record state machine.
 *
 * <pre>
 * IN_PROGRESS ──QA_REVIEW──► QA_REVIEW ──RELEASE──► RELEASED ──RECALL──► RECALLED
 *      │                         │
 *      └──QUARANTINE──► QUARANTINE  └──REJECT──► REJECTED
 *      │                         │
 *      └──────────────────────────┘ (QUARANTINE also from QA_REVIEW)
 * </pre>
 *
 * Preconditions (checked in service, not here, because they query child tables):
 * - QA_REVIEW: at least one production step must be recorded.
 * - RELEASE: at least one QC result linked.
 */
public final class BatchWorkflow {

    public static final String RECORD_TYPE = "BatchRecord";

    public static final String SUBMIT_FOR_QA_REVIEW = "SUBMIT_FOR_QA_REVIEW";
    public static final String RELEASE = "RELEASE";
    public static final String REJECT = "REJECT";
    public static final String QUARANTINE = "QUARANTINE";
    public static final String RECALL = "RECALL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(SUBMIT_FOR_QA_REVIEW, "IN_PROGRESS", "QA_REVIEW")
                    .requiredAuthority("BATCH_CREATE")
                    .build(),

            WorkflowTransition.builder(RELEASE, "QA_REVIEW", "RELEASED")
                    .requiredAuthority("BATCH_RELEASE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.RELEASED)
                    .build(),

            WorkflowTransition.builder(REJECT, "QA_REVIEW", "REJECTED")
                    .requiredAuthority("BATCH_RELEASE")
                    .approval(true)
                    .build(),

            // QUARANTINE can be triggered from IN_PROGRESS or QA_REVIEW — same action, different fromStatus.
            // WorkflowDefinition.find() matches on (fromStatus, action) so both are valid.
            WorkflowTransition.builder(QUARANTINE, "IN_PROGRESS", "QUARANTINE")
                    .requiredAuthority("BATCH_RELEASE")
                    .build(),

            WorkflowTransition.builder(QUARANTINE, "QA_REVIEW", "QUARANTINE")
                    .requiredAuthority("BATCH_RELEASE")
                    .build(),

            WorkflowTransition.builder(RECALL, "RELEASED", "RECALLED")
                    .requiredAuthority("BATCH_RELEASE")
                    .approval(true)
                    .build()
    ));

    private BatchWorkflow() {
    }
}
