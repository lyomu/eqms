package com.eqms.shared.constants;

/**
 * The set of regulated actions that MUST produce an append-only audit entry
 * (CLAUDE.md compliance rule 1). Every create/edit/submit/approve/reject/close/
 * status-change writes an {@code audit_logs} row recording the action below.
 *
 * <p>Stored as the enum name in {@code audit_logs.action}.</p>
 */
public enum AuditAction {
    /** A new regulated record was created. */
    CREATE,
    /** A field on an existing record was changed (old/new value captured per field). */
    UPDATE,
    /** A record was submitted into a workflow (e.g. submitted for review/approval). */
    SUBMIT,
    /** A record was approved. */
    APPROVE,
    /** A record was rejected / changes requested. */
    REJECT,
    /** A record was closed. */
    CLOSE,
    /** A workflow status transition occurred. */
    STATUS_CHANGE,
    /** A record was soft-deleted (deleted_at set). Hard deletes are never permitted. */
    SOFT_DELETE,
    /** An electronic signature was applied. */
    SIGN,
    /** Authentication event (login/logout/lockout) — relevant from Milestone 1. */
    LOGIN
}
