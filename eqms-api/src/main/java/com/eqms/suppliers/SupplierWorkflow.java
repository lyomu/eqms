package com.eqms.suppliers;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * Supplier qualification state machine.
 *
 * <pre>
 * UNAPPROVED ──QUALIFY──► QUALIFIED
 *     │  └──MAKE_CONDITIONAL──► CONDITIONAL
 *     └──(QUALIFIED) ──MAKE_CONDITIONAL──► CONDITIONAL ──QUALIFY──► QUALIFIED
 * </pre>
 *
 * QUALIFY is the quality decision that permits use of the supplier: it requires an APPROVED sign-off
 * signature and blocks self-approval (the person who created the supplier cannot qualify it).
 * CONDITIONAL allows limited use pending corrective actions.
 */
public final class SupplierWorkflow {

    public static final String RECORD_TYPE = "Supplier";

    public static final String QUALIFY = "QUALIFY";
    public static final String MAKE_CONDITIONAL = "MAKE_CONDITIONAL";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            WorkflowTransition.builder(QUALIFY, "UNAPPROVED", "QUALIFIED")
                    .requiredAuthority("SUPPLIER_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(QUALIFY, "CONDITIONAL", "QUALIFIED")
                    .requiredAuthority("SUPPLIER_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(MAKE_CONDITIONAL, "UNAPPROVED", "CONDITIONAL")
                    .requiredAuthority("SUPPLIER_APPROVE")
                    .build(),

            WorkflowTransition.builder(MAKE_CONDITIONAL, "QUALIFIED", "CONDITIONAL")
                    .requiredAuthority("SUPPLIER_APPROVE")
                    .build()
    ));

    private SupplierWorkflow() {
    }
}
