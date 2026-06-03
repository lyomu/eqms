package com.eqms.workflows;

/** Thrown when a user attempts to approve their own record (CLAUDE.md compliance rule 7). */
public class SelfApprovalException extends WorkflowException {

    public SelfApprovalException(String message) {
        super(message);
    }
}
