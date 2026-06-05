package com.eqms.oosmanagement;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * OOS Case state machine.
 *
 * <pre>
 * REPORTED ──ASSESS──► INITIAL_ASSESSMENT ─┬─ORDER_REPEAT──► AWAITING_REPEAT ─┬─RECORD_REPEAT_PASS──► DISPOSITION_DETERMINED
 *                                           │                                  └─RECORD_REPEAT_FAIL──► INVESTIGATING
 *                                           └─BEGIN_INVESTIGATION──► INVESTIGATING ──DETERMINE_DISPOSITION──► DISPOSITION_DETERMINED
 *
 * DISPOSITION_DETERMINED ──CLOSE──► CLOSED  (self-approval blocked; requires APPROVED signature)
 * </pre>
 *
 * DETERMINE_DISPOSITION requires an APPROVED signature (QA sign-off on the decision).
 * CLOSE blocks self-approval (the reporter cannot close their own case) and also requires APPROVED signature.
 */
public final class OosWorkflow {

    public static final String RECORD_TYPE = "OosCase";

    public static final String ASSESS = "ASSESS";
    public static final String ORDER_REPEAT = "ORDER_REPEAT";
    public static final String BEGIN_INVESTIGATION = "BEGIN_INVESTIGATION";
    public static final String RECORD_REPEAT_PASS = "RECORD_REPEAT_PASS";
    public static final String RECORD_REPEAT_FAIL = "RECORD_REPEAT_FAIL";
    public static final String DETERMINE_DISPOSITION = "DETERMINE_DISPOSITION";
    public static final String CLOSE = "CLOSE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(ASSESS, "REPORTED", "INITIAL_ASSESSMENT")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(ORDER_REPEAT, "INITIAL_ASSESSMENT", "AWAITING_REPEAT")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(BEGIN_INVESTIGATION, "INITIAL_ASSESSMENT", "INVESTIGATING")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(RECORD_REPEAT_PASS, "AWAITING_REPEAT", "DISPOSITION_DETERMINED")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(RECORD_REPEAT_FAIL, "AWAITING_REPEAT", "INVESTIGATING")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(DETERMINE_DISPOSITION, "INVESTIGATING", "DISPOSITION_DETERMINED")
                    .requiredAuthority("OOS_APPROVE")
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(CLOSE, "DISPOSITION_DETERMINED", "CLOSED")
                    .requiredAuthority("OOS_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build()
    ));

    private OosWorkflow() {
    }
}
