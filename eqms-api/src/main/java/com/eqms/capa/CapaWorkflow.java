package com.eqms.capa;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowAware;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * The CAPA state machine. Two signature points: APPROVE (the investigation/plan) and CLOSE (after
 * the effectiveness check). SUBMIT_FOR_APPROVAL requires a documented root cause.
 *
 * <pre>
 * Draft -> Under Investigation -> Pending Approval -> Approved -> In Progress
 *       -> Pending Effectiveness Check -> Closed   (Rejected / Cancelled branches)
 * </pre>
 */
public final class CapaWorkflow {

    public static final String RECORD_TYPE = "Capa";

    public static final String SUBMIT_FOR_INVESTIGATION = "SUBMIT_FOR_INVESTIGATION";
    public static final String SUBMIT_FOR_APPROVAL = "SUBMIT_FOR_APPROVAL";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String START_ACTIONS = "START_ACTIONS";
    public static final String SUBMIT_FOR_EFFECTIVENESS = "SUBMIT_FOR_EFFECTIVENESS";
    public static final String CLOSE = "CLOSE";
    public static final String CANCEL = "CANCEL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder(SUBMIT_FOR_INVESTIGATION, "DRAFT", "UNDER_INVESTIGATION")
                    .requiredAuthority("CAPA_CREATE")
                    .precondition(CapaWorkflow::hasTitleAndDescription,
                            "Title and description are required before investigation")
                    .build(),
            WorkflowTransition.builder(SUBMIT_FOR_APPROVAL, "UNDER_INVESTIGATION", "PENDING_APPROVAL")
                    .requiredAuthority("CAPA_CREATE")
                    .precondition(CapaWorkflow::hasRootCause,
                            "A documented root cause is required before approval")
                    .build(),
            WorkflowTransition.builder(APPROVE, "PENDING_APPROVAL", "APPROVED")
                    .requiredAuthority("CAPA_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(REJECT, "PENDING_APPROVAL", "UNDER_INVESTIGATION")
                    .requiredAuthority("CAPA_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(START_ACTIONS, "APPROVED", "IN_PROGRESS")
                    .requiredAuthority("CAPA_CREATE")
                    .build(),
            WorkflowTransition.builder(SUBMIT_FOR_EFFECTIVENESS, "IN_PROGRESS", "PENDING_EFFECTIVENESS_CHECK")
                    .requiredAuthority("CAPA_CREATE")
                    .build(),
            WorkflowTransition.builder(CLOSE, "PENDING_EFFECTIVENESS_CHECK", "CLOSED")
                    .requiredAuthority("CAPA_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(CANCEL, "DRAFT", "CANCELLED")
                    .requiredAuthority("CAPA_CREATE")
                    .build()
    ));

    private CapaWorkflow() {
    }

    private static boolean hasTitleAndDescription(WorkflowAware entity) {
        Capa capa = (Capa) entity;
        return capa.getTitle() != null && !capa.getTitle().isBlank()
                && capa.getDescription() != null && !capa.getDescription().isBlank();
    }

    private static boolean hasRootCause(WorkflowAware entity) {
        Capa capa = (Capa) entity;
        return capa.getRootCause() != null && !capa.getRootCause().isBlank();
    }
}
