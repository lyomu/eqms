package com.eqms.audits;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Quality-audit state machine.
 *
 * <pre>
 * PLANNED ──START──► IN_PROGRESS ──FINALIZE──► COMPLETED ──INITIATE_FOLLOW_UP──► FOLLOW_UP
 *    └──CANCEL──► CANCELLED
 * </pre>
 *
 * START is performed by the {@code plan} endpoint (defining scope/auditees begins fieldwork).
 * FINALIZE requires an APPROVED sign-off signature and blocks self-approval (the auditor who
 * conducted the audit cannot sign off its completion).
 */
public final class AuditWorkflow {

    public static final String RECORD_TYPE = "Audit";

    public static final String START = "START";
    public static final String FINALIZE = "FINALIZE";
    public static final String INITIATE_FOLLOW_UP = "INITIATE_FOLLOW_UP";
    public static final String CANCEL = "CANCEL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(START, "PLANNED", "IN_PROGRESS")
                    .requiredAuthority("AUDIT_MANAGE")
                    .build(),

            WorkflowTransition.builder(FINALIZE, "IN_PROGRESS", "COMPLETED")
                    .requiredAuthority("AUDIT_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(INITIATE_FOLLOW_UP, "COMPLETED", "FOLLOW_UP")
                    .requiredAuthority("AUDIT_MANAGE")
                    .build(),

            WorkflowTransition.builder(CANCEL, "PLANNED", "CANCELLED")
                    .requiredAuthority("AUDIT_MANAGE")
                    .build()
    ));

    private AuditWorkflow() {
    }
}
