package com.eqms.deviations;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowAware;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * The Deviation state machine. APPROVE requires an APPROVED signature and blocks self-approval;
 * SUBMIT_FOR_APPROVAL requires a documented root cause.
 *
 * <pre>
 * Draft -> Under Investigation -> Pending Approval -> Approved -> Closed
 *       (Rejected / Cancelled branches)
 * </pre>
 */
public final class DeviationWorkflow {

    public static final String RECORD_TYPE = "Deviation";

    public static final String SUBMIT_FOR_INVESTIGATION = "SUBMIT_FOR_INVESTIGATION";
    public static final String SUBMIT_FOR_APPROVAL = "SUBMIT_FOR_APPROVAL";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String CLOSE = "CLOSE";
    public static final String CANCEL = "CANCEL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder(SUBMIT_FOR_INVESTIGATION, "DRAFT", "UNDER_INVESTIGATION")
                    .requiredAuthority("DEVIATION_CREATE")
                    .precondition(DeviationWorkflow::hasTitleAndDescription,
                            "Title and description are required before investigation")
                    .build(),
            WorkflowTransition.builder(SUBMIT_FOR_APPROVAL, "UNDER_INVESTIGATION", "PENDING_APPROVAL")
                    .requiredAuthority("DEVIATION_CREATE")
                    .precondition(DeviationWorkflow::hasRootCause,
                            "A documented root cause is required before approval")
                    .build(),
            WorkflowTransition.builder(APPROVE, "PENDING_APPROVAL", "APPROVED")
                    .requiredAuthority("DEVIATION_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(REJECT, "PENDING_APPROVAL", "UNDER_INVESTIGATION")
                    .requiredAuthority("DEVIATION_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(CLOSE, "APPROVED", "CLOSED")
                    .requiredAuthority("DEVIATION_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(CANCEL, "DRAFT", "CANCELLED")
                    .requiredAuthority("DEVIATION_CREATE")
                    .build()
    ));

    private DeviationWorkflow() {
    }

    private static boolean hasTitleAndDescription(WorkflowAware entity) {
        Deviation d = (Deviation) entity;
        return d.getTitle() != null && !d.getTitle().isBlank()
                && d.getDescription() != null && !d.getDescription().isBlank();
    }

    private static boolean hasRootCause(WorkflowAware entity) {
        Deviation d = (Deviation) entity;
        return d.getRootCause() != null && !d.getRootCause().isBlank();
    }
}
