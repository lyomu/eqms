export type NcType = "MATERIAL" | "PRODUCT" | "PROCESS";
export type NcStatus = "OPEN" | "INVESTIGATING" | "DISPOSITION_APPROVED" | "ACTION_IMPLEMENTED" | "CLOSED";
export type NcDisposition = "SCRAP" | "REWORK" | "USE_AS_IS" | "RETURN_TO_SUPPLIER";

export const NC_TYPE_LABELS: Record<NcType, string> = { MATERIAL: "Material", PRODUCT: "Product", PROCESS: "Process" };
export const NC_STATUS_LABELS: Record<NcStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  DISPOSITION_APPROVED: "Disposition Approved",
  ACTION_IMPLEMENTED: "Action Implemented",
  CLOSED: "Closed",
};
export const NC_DISPOSITION_LABELS: Record<NcDisposition, string> = {
  SCRAP: "Scrap",
  REWORK: "Rework",
  USE_AS_IS: "Use As Is",
  RETURN_TO_SUPPLIER: "Return to Supplier",
};

export interface NonConformanceResponse {
  id: number; ncNo: string; title: string; description: string; ncType: NcType;
  affectedItemId: number | null; affectedItemType: string | null; discoveredDate: string | null; discoveredBy: string | null;
  ownerId: number | null; status: NcStatus; submittedBy: number | null; closedDate: string | null; version: number;
  createdAt: string; createdBy: number | null; updatedAt: string;
  investigation: null | { investigationFindings: string; rootCause: string | null; investigatorId: number | null; investigationDate: string | null };
  disposition: null | { disposition: NcDisposition; rationale: string; reworkSpecifications: string | null; reworkCompleted: boolean | null; approvedBy: number | null; approvedDate: string | null };
  useAsIsApproval: null | { useAsIsJustification: string; riskAssessment: string | null; approvedBy: number | null; approvedDate: string | null };
  linkedCapaIds: number[];
}
