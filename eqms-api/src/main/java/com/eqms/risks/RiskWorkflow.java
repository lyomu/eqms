package com.eqms.risks;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Risk Management state machine (ISO 31000 / ICH Q9).
 *
 * <pre>
 * IDENTIFIED ──HAZARD_ANALYSIS──► ANALYZED ──IMPLEMENT_CONTROLS──► MITIGATED ──ACCEPT──► ACCEPTED ──CLOSE──► CLOSED
 *      └──CANCEL──► CANCELLED
 * </pre>
 *
 * ACCEPT is management acceptance: it requires an APPROVED sign-off signature and blocks
 * self-approval (the risk owner cannot accept their own risk). Required preconditions (≥1 control,
 * residual risk verified acceptable) are validated in the service.
 */
public final class RiskWorkflow {

    public static final String RECORD_TYPE = "Risk";

    public static final String HAZARD_ANALYSIS = "HAZARD_ANALYSIS";
    public static final String IMPLEMENT_CONTROLS = "IMPLEMENT_CONTROLS";
    public static final String ACCEPT = "ACCEPT";
    public static final String CLOSE = "CLOSE";
    public static final String CANCEL = "CANCEL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(HAZARD_ANALYSIS, "IDENTIFIED", "ANALYZED")
                    .requiredAuthority("RISK_CREATE")
                    .build(),

            WorkflowTransition.builder(IMPLEMENT_CONTROLS, "ANALYZED", "MITIGATED")
                    .requiredAuthority("RISK_CREATE")
                    .build(),

            WorkflowTransition.builder(ACCEPT, "MITIGATED", "ACCEPTED")
                    .requiredAuthority("RISK_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(CLOSE, "ACCEPTED", "CLOSED")
                    .requiredAuthority("RISK_APPROVE")
                    .build(),

            WorkflowTransition.builder(CANCEL, "IDENTIFIED", "CANCELLED")
                    .requiredAuthority("RISK_CREATE")
                    .build()
    ));

    private RiskWorkflow() {
    }
}
