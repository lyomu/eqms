/** Mirrors the backend Deviation contract (com.eqms.deviations). Base path: /api/deviations. */

export type DeviationStatus =
  | "DRAFT"
  | "UNDER_INVESTIGATION"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export type DeviationSeverity = "MINOR" | "MAJOR" | "CRITICAL";

export const DEVIATION_STATUS_LABELS: Record<DeviationStatus, string> = {
  DRAFT: "Draft",
  UNDER_INVESTIGATION: "Under Investigation",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const DEVIATION_STATUS_CLASSES: Record<DeviationStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  UNDER_INVESTIGATION: "bg-brand-light text-brand-primary",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  APPROVED: "bg-success/15 text-success",
  CLOSED: "bg-success text-white",
  REJECTED: "bg-error/15 text-error",
  CANCELLED: "bg-slate-200 text-slate-700",
};

/** Severity → Badge variant (Critical red, Major amber, Minor neutral). */
export const SEVERITY_VARIANT: Record<DeviationSeverity, "error" | "warning" | "neutral"> = {
  CRITICAL: "error",
  MAJOR: "warning",
  MINOR: "neutral",
};

export interface DeviationResponse {
  id: number;
  deviationNumber: string;
  title: string;
  severity: DeviationSeverity;
  status: DeviationStatus;
  version: number;
  description: string;
  rootCause: string | null;
  immediateAction: string | null;
  occurredDate: string | null;
  closedDate: string | null;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}
