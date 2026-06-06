/** Mirrors the backend Complaint contract (com.eqms.complaints). Base: /api/complaints. */

export type ComplaintStatus = "OPEN" | "ACKNOWLEDGED" | "UNDER_INVESTIGATION" | "RESOLVED" | "CLOSED" | "CANCELLED";
export type ComplaintSource = "CUSTOMER" | "INTERNAL";
export type ComplaintSeverity = "CRITICAL" | "MAJOR" | "MINOR";

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  UNDER_INVESTIGATION: "Under Investigation",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const COMPLAINT_STATUS_CLASSES: Record<ComplaintStatus, string> = {
  OPEN: "bg-muted text-muted-foreground",
  ACKNOWLEDGED: "bg-brand-light text-brand-primary",
  UNDER_INVESTIGATION: "bg-brand-light text-brand-primary",
  RESOLVED: "bg-success/15 text-success",
  CLOSED: "bg-success text-white",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export const SEVERITY_VARIANT: Record<ComplaintSeverity, "error" | "warning" | "neutral"> = {
  CRITICAL: "error",
  MAJOR: "warning",
  MINOR: "neutral",
};

export interface ComplaintInvestigation {
  investigationFindings: string | null;
  investigatorId: number | null;
  investigationDate: string | null;
  rootCause: string | null;
  rootCauseMethod: string | null;
  impactOnProduct: string | null;
}

export interface ComplaintResolution {
  resolutionDescription: string | null;
  resolutionDate: string | null;
  resolvedBy: number | null;
}

export interface ComplaintResponse {
  id: number;
  complaintNo: string;
  productId: number | null;
  complaintDescription: string;
  source: ComplaintSource;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  version: number;
  reportedDate: string | null;
  reportedBy: string | null;
  ownerId: number | null;
  submittedBy: number | null;
  closedDate: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  investigation: ComplaintInvestigation | null;
  resolution: ComplaintResolution | null;
  linkedCapaIds: number[];
}
