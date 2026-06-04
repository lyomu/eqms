package com.eqms.materials;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowAware;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * The Material master-data state machine. Approval (release for use) requires an APPROVED signature
 * and blocks self-approval; hold/release/obsolete are QA status changes.
 *
 * <pre>
 * Draft -> Pending Approval -> Approved -> On Hold -> Approved
 *                                       -> Obsolete       (Rejected branch)
 * </pre>
 */
public final class MaterialWorkflow {

    public static final String RECORD_TYPE = "Material";

    public static final String SUBMIT_FOR_APPROVAL = "SUBMIT_FOR_APPROVAL";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String PUT_ON_HOLD = "PUT_ON_HOLD";
    public static final String RELEASE = "RELEASE";
    public static final String OBSOLETE = "OBSOLETE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder(SUBMIT_FOR_APPROVAL, "DRAFT", "PENDING_APPROVAL")
                    .requiredAuthority("MATERIAL_CREATE")
                    .precondition(MaterialWorkflow::hasNameAndType,
                            "Name and material type are required before approval")
                    .build(),
            WorkflowTransition.builder(APPROVE, "PENDING_APPROVAL", "APPROVED")
                    .requiredAuthority("MATERIAL_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(REJECT, "PENDING_APPROVAL", "REJECTED")
                    .requiredAuthority("MATERIAL_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(PUT_ON_HOLD, "APPROVED", "ON_HOLD")
                    .requiredAuthority("MATERIAL_APPROVE")
                    .build(),
            WorkflowTransition.builder(RELEASE, "ON_HOLD", "APPROVED")
                    .requiredAuthority("MATERIAL_APPROVE")
                    .build(),
            WorkflowTransition.builder(OBSOLETE, "APPROVED", "OBSOLETE")
                    .requiredAuthority("MATERIAL_APPROVE")
                    .build()
    ));

    private MaterialWorkflow() {
    }

    private static boolean hasNameAndType(WorkflowAware entity) {
        Material m = (Material) entity;
        return m.getName() != null && !m.getName().isBlank() && m.getMaterialType() != null;
    }
}
