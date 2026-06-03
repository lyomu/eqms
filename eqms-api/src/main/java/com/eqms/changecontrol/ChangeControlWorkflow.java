package com.eqms.changecontrol;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowAware;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * The Change Control state machine, declared for the shared WorkflowService. The module holds this
 * and passes it on every transition; it contains no transition logic of its own.
 *
 * <pre>
 * Draft -> Under Review -> (Changes Requested) -> Pending Approval -> Approved
 *       -> In Implementation -> Implemented -> Pending Closure -> Closed
 *       (Rejected / Cancelled are terminal branches)
 * </pre>
 */
public final class ChangeControlWorkflow {

    public static final String RECORD_TYPE = "ChangeControl";

    public static final String SUBMIT_FOR_REVIEW = "SUBMIT_FOR_REVIEW";
    public static final String REQUEST_CHANGES = "REQUEST_CHANGES";
    public static final String RESUBMIT_FOR_REVIEW = "RESUBMIT_FOR_REVIEW";
    public static final String SUBMIT_FOR_APPROVAL = "SUBMIT_FOR_APPROVAL";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String START_IMPLEMENTATION = "START_IMPLEMENTATION";
    public static final String COMPLETE_IMPLEMENTATION = "COMPLETE_IMPLEMENTATION";
    public static final String SUBMIT_FOR_CLOSURE = "SUBMIT_FOR_CLOSURE";
    public static final String CLOSE = "CLOSE";
    public static final String CANCEL = "CANCEL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder(SUBMIT_FOR_REVIEW, "DRAFT", "UNDER_REVIEW")
                    .requiredAuthority("CHANGE_CREATE")
                    .precondition(ChangeControlWorkflow::hasTitleAndDescription,
                            "Title and description are required before submitting for review")
                    .build(),
            WorkflowTransition.builder(REQUEST_CHANGES, "UNDER_REVIEW", "CHANGES_REQUESTED")
                    .requiredAuthority("CHANGE_APPROVE")
                    .build(),
            WorkflowTransition.builder(RESUBMIT_FOR_REVIEW, "CHANGES_REQUESTED", "UNDER_REVIEW")
                    .requiredAuthority("CHANGE_CREATE")
                    .build(),
            WorkflowTransition.builder(SUBMIT_FOR_APPROVAL, "UNDER_REVIEW", "PENDING_APPROVAL")
                    .requiredAuthority("CHANGE_APPROVE")
                    .build(),
            WorkflowTransition.builder(APPROVE, "PENDING_APPROVAL", "APPROVED")
                    .requiredAuthority("CHANGE_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(REJECT, "PENDING_APPROVAL", "REJECTED")
                    .requiredAuthority("CHANGE_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(START_IMPLEMENTATION, "APPROVED", "IN_IMPLEMENTATION")
                    .requiredAuthority("CHANGE_CREATE")
                    .build(),
            WorkflowTransition.builder(COMPLETE_IMPLEMENTATION, "IN_IMPLEMENTATION", "IMPLEMENTED")
                    .requiredAuthority("CHANGE_CREATE")
                    .build(),
            WorkflowTransition.builder(SUBMIT_FOR_CLOSURE, "IMPLEMENTED", "PENDING_CLOSURE")
                    .requiredAuthority("CHANGE_CREATE")
                    .build(),
            WorkflowTransition.builder(CLOSE, "PENDING_CLOSURE", "CLOSED")
                    .requiredAuthority("CHANGE_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(CANCEL, "DRAFT", "CANCELLED")
                    .requiredAuthority("CHANGE_CREATE")
                    .build()
    ));

    private ChangeControlWorkflow() {
    }

    private static boolean hasTitleAndDescription(WorkflowAware entity) {
        ChangeControl cc = (ChangeControl) entity;
        return cc.getTitle() != null && !cc.getTitle().isBlank()
                && cc.getDescription() != null && !cc.getDescription().isBlank();
    }
}
