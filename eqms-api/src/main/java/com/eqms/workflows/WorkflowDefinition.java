package com.eqms.workflows;

import java.util.List;
import java.util.Optional;

/**
 * A module's set of allowed {@link WorkflowTransition}s for one record type. Held statically by the
 * module (e.g. Document Control) and passed to {@link WorkflowService} on each transition — the
 * single, auditable source of truth for that module's status machine.
 */
public final class WorkflowDefinition {

    private final String recordType;
    private final List<WorkflowTransition> transitions;

    public WorkflowDefinition(String recordType, List<WorkflowTransition> transitions) {
        this.recordType = recordType;
        this.transitions = List.copyOf(transitions);
    }

    public String recordType() {
        return recordType;
    }

    public List<WorkflowTransition> transitions() {
        return transitions;
    }

    /** Find the transition for an action available from the given current status. */
    public Optional<WorkflowTransition> find(String fromStatus, String action) {
        return transitions.stream()
                .filter(t -> t.fromStatus().equals(fromStatus) && t.action().equals(action))
                .findFirst();
    }
}
