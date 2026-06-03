package com.eqms.products;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowAware;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * The Product master-data state machine. Activation (APPROVE) requires an APPROVED signature and
 * blocks self-approval. On-hold / resume / discontinue are QA status changes.
 *
 * <pre>
 * Draft -> Pending Approval -> Active -> On Hold -> Active
 *                                     -> Discontinued     (Rejected branch)
 * </pre>
 */
public final class ProductWorkflow {

    public static final String RECORD_TYPE = "Product";

    public static final String SUBMIT_FOR_APPROVAL = "SUBMIT_FOR_APPROVAL";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String PUT_ON_HOLD = "PUT_ON_HOLD";
    public static final String RESUME = "RESUME";
    public static final String DISCONTINUE = "DISCONTINUE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder(SUBMIT_FOR_APPROVAL, "DRAFT", "PENDING_APPROVAL")
                    .requiredAuthority("PRODUCT_CREATE")
                    .precondition(ProductWorkflow::hasNameAndForm,
                            "Name and dosage form are required before approval")
                    .build(),
            WorkflowTransition.builder(APPROVE, "PENDING_APPROVAL", "ACTIVE")
                    .requiredAuthority("PRODUCT_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(REJECT, "PENDING_APPROVAL", "REJECTED")
                    .requiredAuthority("PRODUCT_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(PUT_ON_HOLD, "ACTIVE", "ON_HOLD")
                    .requiredAuthority("PRODUCT_APPROVE")
                    .build(),
            WorkflowTransition.builder(RESUME, "ON_HOLD", "ACTIVE")
                    .requiredAuthority("PRODUCT_APPROVE")
                    .build(),
            WorkflowTransition.builder(DISCONTINUE, "ACTIVE", "DISCONTINUED")
                    .requiredAuthority("PRODUCT_APPROVE")
                    .build()
    ));

    private ProductWorkflow() {
    }

    private static boolean hasNameAndForm(WorkflowAware entity) {
        Product p = (Product) entity;
        return p.getName() != null && !p.getName().isBlank() && p.getDosageForm() != null;
    }
}
