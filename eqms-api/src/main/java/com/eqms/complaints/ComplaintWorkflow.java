package com.eqms.complaints;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Complaint state machine.
 *
 * <pre>
 * OPEN ──ACKNOWLEDGE──► ACKNOWLEDGED ──INVESTIGATE──► UNDER_INVESTIGATION ──RESOLVE──► RESOLVED ──CLOSE──► CLOSED
 *   └──CANCEL──► CANCELLED
 * </pre>
 *
 * Acknowledgment requires an ACKNOWLEDGED signature; closure requires an APPROVED signature and
 * blocks self-approval (the resolver cannot also close). Required fields (investigation findings,
 * resolution description) are validated in the service before the transition.
 */
public final class ComplaintWorkflow {

    public static final String RECORD_TYPE = "Complaint";

    public static final String ACKNOWLEDGE = "ACKNOWLEDGE";
    public static final String INVESTIGATE = "INVESTIGATE";
    public static final String RESOLVE = "RESOLVE";
    public static final String CLOSE = "CLOSE";
    public static final String CANCEL = "CANCEL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(ACKNOWLEDGE, "OPEN", "ACKNOWLEDGED")
                    .requiredAuthority("COMPLAINT_APPROVE")
                    .requiredSignature(SignatureMeaning.ACKNOWLEDGED)
                    .build(),

            WorkflowTransition.builder(INVESTIGATE, "ACKNOWLEDGED", "UNDER_INVESTIGATION")
                    .requiredAuthority("COMPLAINT_CREATE")
                    .build(),

            WorkflowTransition.builder(RESOLVE, "UNDER_INVESTIGATION", "RESOLVED")
                    .requiredAuthority("COMPLAINT_CREATE")
                    .build(),

            WorkflowTransition.builder(CLOSE, "RESOLVED", "CLOSED")
                    .requiredAuthority("COMPLAINT_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(CANCEL, "OPEN", "CANCELLED")
                    .requiredAuthority("COMPLAINT_APPROVE")
                    .build()
    ));

    private ComplaintWorkflow() {
    }
}
