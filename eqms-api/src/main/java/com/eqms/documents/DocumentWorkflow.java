package com.eqms.documents;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowAware;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

/**
 * The Document Control state machine, expressed declaratively for the shared WorkflowService.
 * The module holds this definition and passes it on every transition — it contains no transition
 * logic of its own (CLAUDE.md architecture principle).
 *
 * <pre>
 * Draft -> Under Review -> Changes Requested -> Pending Approval -> Approved -> Effective
 *       -> Superseded -> Obsolete -> Archived
 * </pre>
 */
public final class DocumentWorkflow {

    public static final String RECORD_TYPE = "Document";

    public static final String SUBMIT_FOR_REVIEW = "SUBMIT_FOR_REVIEW";
    public static final String REQUEST_CHANGES = "REQUEST_CHANGES";
    public static final String RESUBMIT_FOR_REVIEW = "RESUBMIT_FOR_REVIEW";
    public static final String SUBMIT_FOR_APPROVAL = "SUBMIT_FOR_APPROVAL";
    public static final String APPROVE = "APPROVE";
    public static final String REJECT = "REJECT";
    public static final String MAKE_EFFECTIVE = "MAKE_EFFECTIVE";
    public static final String SUPERSEDE = "SUPERSEDE";
    public static final String OBSOLETE = "OBSOLETE";
    public static final String ARCHIVE = "ARCHIVE";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(
            WorkflowTransition.builder(SUBMIT_FOR_REVIEW, "DRAFT", "UNDER_REVIEW")
                    .requiredAuthority("DOCUMENT_CREATE")
                    .precondition(DocumentWorkflow::hasTitleAndContent,
                            "Title and content are required before submitting for review")
                    .build(),
            WorkflowTransition.builder(REQUEST_CHANGES, "UNDER_REVIEW", "CHANGES_REQUESTED")
                    .requiredAuthority("DOCUMENT_REVIEW")
                    .build(),
            WorkflowTransition.builder(RESUBMIT_FOR_REVIEW, "CHANGES_REQUESTED", "UNDER_REVIEW")
                    .requiredAuthority("DOCUMENT_CREATE")
                    .build(),
            WorkflowTransition.builder(SUBMIT_FOR_APPROVAL, "UNDER_REVIEW", "PENDING_APPROVAL")
                    .requiredAuthority("DOCUMENT_REVIEW")
                    .build(),
            WorkflowTransition.builder(APPROVE, "PENDING_APPROVAL", "APPROVED")
                    .requiredAuthority("DOCUMENT_APPROVE")
                    .approval(true)
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),
            WorkflowTransition.builder(REJECT, "PENDING_APPROVAL", "CHANGES_REQUESTED")
                    .requiredAuthority("DOCUMENT_APPROVE")
                    .approval(true)
                    .build(),
            WorkflowTransition.builder(MAKE_EFFECTIVE, "APPROVED", "EFFECTIVE")
                    .requiredAuthority("DOCUMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(SUPERSEDE, "EFFECTIVE", "SUPERSEDED")
                    .requiredAuthority("DOCUMENT_APPROVE")
                    .build(),
            WorkflowTransition.builder(OBSOLETE, "EFFECTIVE", "OBSOLETE")
                    .requiredAuthority("DOCUMENT_OBSOLETE")
                    .build(),
            WorkflowTransition.builder(ARCHIVE, "OBSOLETE", "ARCHIVED")
                    .requiredAuthority("DOCUMENT_OBSOLETE")
                    .build()
    ));

    private DocumentWorkflow() {
    }

    private static boolean hasTitleAndContent(WorkflowAware entity) {
        Document document = (Document) entity;
        return document.getTitle() != null && !document.getTitle().isBlank()
                && document.getContent() != null && !document.getContent().isBlank();
    }
}
