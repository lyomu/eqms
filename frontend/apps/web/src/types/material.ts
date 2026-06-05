/** Mirrors the backend Material Management contract (com.eqms.materials). Base path: /api/materials. */

export type MaterialStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ON_HOLD"
  | "OBSOLETE"
  | "REJECTED";

export type MaterialType =
  | "RAW_MATERIAL"
  | "ACTIVE_INGREDIENT"
  | "EXCIPIENT"
  | "PACKAGING"
  | "INTERMEDIATE"
  | "OTHER";

export type UnitOfMeasure = "KG" | "G" | "MG" | "L" | "ML" | "UNIT" | "EACH";

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  ON_HOLD: "On Hold",
  OBSOLETE: "Obsolete",
  REJECTED: "Rejected",
};

export const MATERIAL_STATUS_CLASSES: Record<MaterialStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  APPROVED: "bg-success text-white",
  ON_HOLD: "bg-warning/20 text-[#8A6D00]",
  OBSOLETE: "bg-slate-200 text-slate-700",
  REJECTED: "bg-error/15 text-error",
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  RAW_MATERIAL: "Raw Material",
  ACTIVE_INGREDIENT: "Active Ingredient",
  EXCIPIENT: "Excipient",
  PACKAGING: "Packaging",
  INTERMEDIATE: "Intermediate",
  OTHER: "Other",
};

export const UOM_LABELS: Record<UnitOfMeasure, string> = {
  KG: "kg",
  G: "g",
  MG: "mg",
  L: "L",
  ML: "mL",
  UNIT: "unit",
  EACH: "each",
};

export interface MaterialResponse {
  id: number;
  materialCode: string;
  name: string;
  materialType: MaterialType;
  unitOfMeasure: UnitOfMeasure;
  specification: string | null;
  description: string | null;
  status: MaterialStatus;
  version: number;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}
