package com.eqms.workflows;

/** Base exception for an invalid or disallowed workflow transition. Rolls back the transaction. */
public class WorkflowException extends RuntimeException {

    public WorkflowException(String message) {
        super(message);
    }
}
