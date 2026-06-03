package com.eqms.shared.constants;

/**
 * Generic lifecycle states shared by regulated records. Module-specific workflows
 * (e.g. Document Control's Draft → Under Review → … → Archived) are defined in their
 * own modules from Milestone 3 onward; this enum holds only the cross-cutting states
 * referenced by the shared workflow/audit core.
 */
public enum RecordStatus {
    DRAFT,
    ACTIVE,
    LOCKED,
    DISABLED
}
