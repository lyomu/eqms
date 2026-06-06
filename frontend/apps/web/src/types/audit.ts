/** Mirrors the backend Audit Management contract (com.eqms.audits). Base: /api/audits. */

export type AuditStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "FOLLOW_UP" | "CANCELLED";
export type AuditTypeKey = "INTERNAL" | "SUPPLIER";
export type FindingSeverity = "CRITICAL" | "MAJOR" | "MINOR";
export type FollowUpStatus = "CLOSED" | "STILL_OPEN";

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  FOLLOW_UP: "Follow-up",
  CANCELLED: "Cancelled",
};

export const AUDIT_STATUS_CLASSES: Record<AuditStatus, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-brand-light text-brand-primary",
  COMPLETED: "bg-success text-white",
  FOLLOW_UP: "bg-warning/20 text-[#8A6D00]",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export const FINDING_SEVERITY_VARIANT: Record<FindingSeverity, "error" | "warning" | "neutral"> = {
  CRITICAL: "error",
  MAJOR: "warning",
  MINOR: "neutral",
};

export interface AuditFinding {
  id: number;
  auditId: number;
  findingNumber: number | null;
  description: string;
  area: string | null;
  severity: FindingSeverity;
  evidence: string | null;
  rootCause: string | null;
  correctiveActionRequired: boolean;
  createdAt: string;
  createdBy: number | null;
}

export interface AuditFollowUp {
  id: number;
  currentAuditId: number;
  previousAuditId: number | null;
  findingId: number | null;
  status: FollowUpStatus;
  notes: string | null;
  createdAt: string;
}

export interface AuditResponse {
  id: number;
  auditNo: string;
  auditTitle: string;
  auditType: AuditTypeKey;
  status: AuditStatus;
  version: number;
  auditDate: string | null;
  auditorId: number | null;
  auditeeId: number | null;
  scope: string;
  submittedBy: number | null;
  completedDate: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  findings: AuditFinding[];
}
