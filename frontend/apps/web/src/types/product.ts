/** Mirrors the backend Product Management contract (com.eqms.products). Base path: /api/products. */

export type ProductStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "ON_HOLD"
  | "DISCONTINUED"
  | "REJECTED";

export type DosageForm =
  | "TABLET"
  | "CAPSULE"
  | "INJECTION"
  | "SYRUP"
  | "CREAM"
  | "OINTMENT"
  | "INHALER"
  | "OTHER";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  DISCONTINUED: "Discontinued",
  REJECTED: "Rejected",
};

export const PRODUCT_STATUS_CLASSES: Record<ProductStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  ACTIVE: "bg-success text-white",
  ON_HOLD: "bg-warning/20 text-[#8A6D00]",
  DISCONTINUED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-error/15 text-error",
};

export const DOSAGE_FORM_LABELS: Record<DosageForm, string> = {
  TABLET: "Tablet",
  CAPSULE: "Capsule",
  INJECTION: "Injection",
  SYRUP: "Syrup",
  CREAM: "Cream",
  OINTMENT: "Ointment",
  INHALER: "Inhaler",
  OTHER: "Other",
};

export interface ProductResponse {
  id: number;
  productCode: string;
  name: string;
  dosageForm: DosageForm;
  strength: string | null;
  description: string | null;
  registrationNumber: string | null;
  status: ProductStatus;
  version: number;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}
