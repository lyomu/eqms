package com.eqms.managementreview;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Management-review state machine.
 *
 * <pre>
 * SCHEDULED ──START──► IN_PROGRESS ──APPROVE──► COMPLETED
 * </pre>
 *
 * START is performed implicitly the first time any review input (metrics, audit results, product
 * feedback, action items, decisions) is captured. APPROVE finalizes the review, requires an
 * APPROVED sign-off signature, and blocks self-approval (rule 7): whoever scheduled or last drove
 * the review cannot also sign it off — a separate manager must approve.
 */
public final class ManagementReviewWorkflow {

    public static final String RECORD_TYPE = "ManagementReview";

    public static final String START = "START";
    public static final String APPROVE = "APPROVE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(START, "SCHEDULED", "IN_PROGRESS")
                    .requiredAuthority("MR_MANAGE")
                    .build(),

            WorkflowTransition.builder(APPROVE, "IN_PROGRESS", "COMPLETED")
                    .requiredAuthority("MR_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build()
    ));

    private ManagementReviewWorkflow() {
    }
}
