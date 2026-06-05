/** Mirrors the backend Change Control contract (com.eqms.changecontrol). Base path: /api/change-controls. */

export type ChangeStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_IMPLEMENTATION"
  | "IMPLEMENTED"
  | "PENDING_CLOSURE"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export type ChangeTypeKey = "MAJOR" | "MINOR";

export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  CHANGES_REQUESTED: "Changes Requested",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  IN_IMPLEMENTATION: "In Implementation",
  IMPLEMENTED: "Implemented",
  PENDING_CLOSURE: "Pending Closure",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export interface ChangeControlResponse {
  id: number;
  changeNumber: string;
  title: string;
  type: ChangeTypeKey;
  status: ChangeStatus;
  version: number;
  description: string;
  justification: string | null;
  effectivenessCheckRequired: boolean;
  targetImplementationDate: string | null;
  implementedDate: string | null;
  closedDate: string | null;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}
