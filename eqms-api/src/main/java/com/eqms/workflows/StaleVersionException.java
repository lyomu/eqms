package com.eqms.workflows;

/** Thrown when the caller's expected version does not match the record's current version (rule 5). */
public class StaleVersionException extends WorkflowException {

    public StaleVersionException(String message) {
        super(message);
    }
}
