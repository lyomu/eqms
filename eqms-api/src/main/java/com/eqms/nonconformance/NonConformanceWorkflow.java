package com.eqms.nonconformance;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Non-Conformance state machine.
 *
 * <pre>
 * OPEN ──INVESTIGATE──► INVESTIGATING ──DETERMINE_DISPOSITION──► DISPOSITION_APPROVED
 *      ──IMPLEMENT_ACTION──► ACTION_IMPLEMENTED ──CLOSE──► CLOSED
 * </pre>
 *
 * DETERMINE_DISPOSITION requires an APPROVED signature (the disposition decision is signed off).
 * A "Use As Is" disposition additionally requires a recorded special approval — enforced in the
 * service before the disposition transition. CLOSE blocks self-approval (rule 7) and also requires
 * an APPROVED signature.
 */
public final class NonConformanceWorkflow {

    public static final String RECORD_TYPE = "NonConformance";

    public static final String INVESTIGATE = "INVESTIGATE";
    public static final String DETERMINE_DISPOSITION = "DETERMINE_DISPOSITION";
    public static final String IMPLEMENT_ACTION = "IMPLEMENT_ACTION";
    public static final String CLOSE = "CLOSE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(INVESTIGATE, "OPEN", "INVESTIGATING")
                    .requiredAuthority("NC_CREATE")
                    .build(),

            WorkflowTransition.builder(DETERMINE_DISPOSITION, "INVESTIGATING", "DISPOSITION_APPROVED")
                    .requiredAuthority("NC_APPROVE")
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(IMPLEMENT_ACTION, "DISPOSITION_APPROVED", "ACTION_IMPLEMENTED")
                    .requiredAuthority("NC_CREATE")
                    .build(),

            WorkflowTransition.builder(CLOSE, "ACTION_IMPLEMENTED", "CLOSED")
                    .requiredAuthority("NC_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build()
    ));

    private NonConformanceWorkflow() {
    }
}
