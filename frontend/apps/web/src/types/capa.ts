/** Mirrors the backend CAPA contract (com.eqms.capa). Base path: /api/capas. */

export type CapaStatus =
  | "DRAFT"
  | "UNDER_INVESTIGATION"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "PENDING_EFFECTIVENESS_CHECK"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export type CapaSource =
  | "DEVIATION"
  | "AUDIT_FINDING"
  | "COMPLAINT"
  | "OOS"
  | "SUPPLIER"
  | "INTERNAL"
  | "OTHER";

export type CapaActionTypeKey = "CORRECTIVE" | "PREVENTIVE";
export type CapaPriority = "CRITICAL" | "MAJOR" | "MINOR" | "NA";

export const CAPA_STATUS_LABELS: Record<CapaStatus, string> = {
  DRAFT: "Draft",
  UNDER_INVESTIGATION: "Under Investigation",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  PENDING_EFFECTIVENESS_CHECK: "Pending Effectiveness",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const CAPA_STATUS_CLASSES: Record<CapaStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  UNDER_INVESTIGATION: "bg-brand-light text-brand-primary",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  APPROVED: "bg-success/15 text-success",
  IN_PROGRESS: "bg-brand-light text-brand-primary",
  PENDING_EFFECTIVENESS_CHECK: "bg-warning/20 text-[#8A6D00]",
  CLOSED: "bg-success text-white",
  REJECTED: "bg-error/15 text-error",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export const CAPA_SOURCE_LABELS: Record<CapaSource, string> = {
  DEVIATION: "Deviation",
  AUDIT_FINDING: "Audit Finding",
  COMPLAINT: "Complaint",
  OOS: "OOS",
  SUPPLIER: "Supplier",
  INTERNAL: "Internal",
  OTHER: "Other",
};

export const CAPA_PRIORITY_LABELS: Record<CapaPriority, string> = {
  CRITICAL: "Critical",
  MAJOR: "Major",
  MINOR: "Minor",
  NA: "N/A",
};

export interface CapaResponse {
  id: number;
  capaNumber: string;
  title: string;
  source: CapaSource;
  status: CapaStatus;
  version: number;
  description: string;
  rootCause: string | null;
  eventDate: string | null;
  priority: CapaPriority | null;
  aboutType: string | null;
  aboutReference: string | null;
  aboutDetails: string | null;
  partyType: string | null;
  partyFirstName: string | null;
  partyLastName: string | null;
  partyJobTitle: string | null;
  partyCompany: string | null;
  partyEmail: string | null;
  partyPhone: string | null;
  containmentDetails: string | null;
  documentReferences: string | null;
  keywords: string | null;
  correctiveActionPlan: string | null;
  preventiveActionPlan: string | null;
  assignedTo: number | null;
  assignmentStatus: string | null;
  assignmentComment: string | null;
  effectivenessCheckRequired: boolean;
  effectivenessCheckResult: string | null;
  dueDate: string | null;
  closedDate: string | null;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapaActionResponse {
  id: number;
  capaId: number;
  actionType: CapaActionTypeKey;
  description: string;
  assignedTo: number | null;
  dueDate: string | null;
  completedDate: string | null;
  version: number;
}
