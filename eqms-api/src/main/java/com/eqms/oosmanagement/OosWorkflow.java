package com.eqms.oosmanagement;

import java.util.List;

import com.eqms.shared.constants.SignatureMeaning;
import com.eqms.workflows.WorkflowDefinition;
import com.eqms.workflows.WorkflowTransition;

public final class OosWorkflow {

    public static final String RECORD_TYPE = "OosCase";

    // Existing transitions (preserved)
    public static final String ASSESS = "ASSESS";
    public static final String ORDER_REPEAT = "ORDER_REPEAT";
    public static final String BEGIN_INVESTIGATION = "BEGIN_INVESTIGATION";
    public static final String RECORD_REPEAT_PASS = "RECORD_REPEAT_PASS";
    public static final String RECORD_REPEAT_FAIL = "RECORD_REPEAT_FAIL";
    public static final String DETERMINE_DISPOSITION = "DETERMINE_DISPOSITION";
    public static final String CLOSE = "CLOSE";

    // New transitions
    public static final String SUBMIT_DRAFT = "SUBMIT_DRAFT";
    public static final String SUBMIT_FOR_QA_REVIEW = "SUBMIT_FOR_QA_REVIEW";
    public static final String QA_ORDER_RETEST = "QA_ORDER_RETEST";
    public static final String QA_ORDER_RESAMPLE = "QA_ORDER_RESAMPLE";
    public static final String QA_APPROVE_INVESTIGATION = "QA_APPROVE_INVESTIGATION";
    public static final String RETEST_PASS = "RETEST_PASS";
    public static final String RETEST_FAIL = "RETEST_FAIL";
    public static final String RESAMPLE_PASS = "RESAMPLE_PASS";
    public static final String RESAMPLE_FAIL = "RESAMPLE_FAIL";
    public static final String REQUIRE_CAPA = "REQUIRE_CAPA";
    public static final String CAPA_COMPLETE_PROCEED = "CAPA_COMPLETE_PROCEED";
    public static final String QA_DISPOSE = "QA_DISPOSE";
    public static final String REOPEN = "REOPEN";
    public static final String CANCEL = "CANCEL";
    public static final String CANCEL_REPORTED = "CANCEL_REPORTED";

    public static final WorkflowDefinition DEFINITION = new WorkflowDefinition(RECORD_TYPE, List.of(

            // --- Existing transitions (unchanged) ---
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
                    .build(),

            // --- New transitions ---
            WorkflowTransition.builder(SUBMIT_DRAFT, "DRAFT", "REPORTED")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(SUBMIT_FOR_QA_REVIEW, "INVESTIGATING", "QA_REVIEW")
                    .requiredAuthority("OOS_INVESTIGATE")
                    .build(),

            WorkflowTransition.builder(QA_ORDER_RETEST, "QA_REVIEW", "RETEST_PENDING")
                    .requiredAuthority("OOS_RETEST_APPROVE")
                    .build(),

            WorkflowTransition.builder(QA_ORDER_RESAMPLE, "QA_REVIEW", "RESAMPLE_PENDING")
                    .requiredAuthority("OOS_RETEST_APPROVE")
                    .build(),

            WorkflowTransition.builder(QA_APPROVE_INVESTIGATION, "QA_REVIEW", "DISPOSITION_PENDING")
                    .requiredAuthority("OOS_DISPOSE")
                    .build(),

            WorkflowTransition.builder(RETEST_PASS, "RETEST_PENDING", "DISPOSITION_PENDING")
                    .requiredAuthority("OOS_RETEST_APPROVE")
                    .build(),

            WorkflowTransition.builder(RETEST_FAIL, "RETEST_PENDING", "INVESTIGATING")
                    .requiredAuthority("OOS_RETEST_APPROVE")
                    .build(),

            WorkflowTransition.builder(RESAMPLE_PASS, "RESAMPLE_PENDING", "DISPOSITION_PENDING")
                    .requiredAuthority("OOS_RETEST_APPROVE")
                    .build(),

            WorkflowTransition.builder(RESAMPLE_FAIL, "RESAMPLE_PENDING", "INVESTIGATING")
                    .requiredAuthority("OOS_RETEST_APPROVE")
                    .build(),

            WorkflowTransition.builder(REQUIRE_CAPA, "INVESTIGATING", "CAPA_REQUIRED")
                    .requiredAuthority("OOS_INVESTIGATE")
                    .build(),

            WorkflowTransition.builder(CAPA_COMPLETE_PROCEED, "CAPA_REQUIRED", "DISPOSITION_PENDING")
                    .requiredAuthority("OOS_INVESTIGATE")
                    .build(),

            WorkflowTransition.builder(QA_DISPOSE, "DISPOSITION_PENDING", "DISPOSITION_DETERMINED")
                    .requiredAuthority("OOS_DISPOSE")
                    .requiredSignature(SignatureMeaning.APPROVED)
                    .build(),

            WorkflowTransition.builder(REOPEN, "CLOSED", "REOPENED")
                    .requiredAuthority("OOS_REOPEN")
                    .approval(true)
                    .build(),

            WorkflowTransition.builder(CANCEL, "DRAFT", "CANCELLED")
                    .requiredAuthority("OOS_CREATE")
                    .build(),

            WorkflowTransition.builder(CANCEL_REPORTED, "REPORTED", "CANCELLED")
                    .requiredAuthority("OOS_CREATE")
                    .build()
    ));

    private OosWorkflow() {
    }
}
