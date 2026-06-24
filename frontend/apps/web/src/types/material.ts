/** Mirrors the backend Material Management contract (com.eqms.materials). Base path: /api/materials. */

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "error";

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
  | "CONSUMABLE"
  | "REAGENT"
  | "REFERENCE_STANDARD"
  | "CLEANING_MATERIAL"
  | "SPARE_PART"
  | "LAB_MATERIAL"
  | "FINISHED_PRODUCT"
  | "OTHER";

export type UnitOfMeasure =
  | "KG"
  | "G"
  | "MG"
  | "L"
  | "ML"
  | "UNIT"
  | "EACH"
  | "MCG"
  | "IU"
  | "TABLET"
  | "CAPSULE"
  | "VIAL"
  | "AMPULE"
  | "SACHET"
  | "BAG"
  | "DRUM"
  | "PALLET"
  | "BOX"
  | "BOTTLE"
  | "PACK"
  | "ROLL"
  | "SHEET"
  | "M"
  | "CM"
  | "MM";

export type LotStatus =
  | "RECEIVED"
  | "QUARANTINED"
  | "SAMPLING_PENDING"
  | "UNDER_QC_TESTING"
  | "QA_REVIEW_PENDING"
  | "RELEASED"
  | "CONDITIONALLY_RELEASED"
  | "REJECTED"
  | "ON_HOLD"
  | "EXPIRED"
  | "RECALLED"
  | "CONSUMED"
  | "DISPOSED";

export type MaterialCategory = "CRITICAL" | "MAJOR" | "MINOR";
export type MaterialCriticality = "CRITICAL" | "NON_CRITICAL";
export type MaterialGrade = "PHARMACEUTICAL" | "ANALYTICAL" | "TECHNICAL" | "FOOD" | "OTHER";
export type StorageCondition =
  | "AMBIENT"
  | "REFRIGERATED"
  | "FROZEN"
  | "CONTROLLED_ROOM_TEMPERATURE"
  | "HUMIDITY_CONTROLLED"
  | "LIGHT_PROTECTED"
  | "HAZARDOUS"
  | "OTHER";

// ─── Label maps ───────────────────────────────────────────────────────────────

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
  PACKAGING: "Packaging Material",
  INTERMEDIATE: "Intermediate",
  CONSUMABLE: "Consumable",
  REAGENT: "Reagent",
  REFERENCE_STANDARD: "Reference Standard",
  CLEANING_MATERIAL: "Cleaning Material",
  SPARE_PART: "Spare Part",
  LAB_MATERIAL: "Lab Material",
  FINISHED_PRODUCT: "Finished Product",
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
  MCG: "mcg",
  IU: "IU",
  TABLET: "tablet",
  CAPSULE: "capsule",
  VIAL: "vial",
  AMPULE: "ampule",
  SACHET: "sachet",
  BAG: "bag",
  DRUM: "drum",
  PALLET: "pallet",
  BOX: "box",
  BOTTLE: "bottle",
  PACK: "pack",
  ROLL: "roll",
  SHEET: "sheet",
  M: "m",
  CM: "cm",
  MM: "mm",
};

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  RECEIVED: "Received",
  QUARANTINED: "Quarantined",
  SAMPLING_PENDING: "Sampling Pending",
  UNDER_QC_TESTING: "Under QC Testing",
  QA_REVIEW_PENDING: "QA Review Pending",
  RELEASED: "Released",
  CONDITIONALLY_RELEASED: "Conditionally Released",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
  EXPIRED: "Expired",
  RECALLED: "Recalled",
  CONSUMED: "Consumed",
  DISPOSED: "Disposed",
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  CRITICAL: "Critical",
  MAJOR: "Major",
  MINOR: "Minor",
};

export const STORAGE_CONDITION_LABELS: Record<StorageCondition, string> = {
  AMBIENT: "Ambient",
  REFRIGERATED: "Refrigerated (2–8°C)",
  FROZEN: "Frozen (≤ −20°C)",
  CONTROLLED_ROOM_TEMPERATURE: "Controlled Room Temperature (15–25°C)",
  HUMIDITY_CONTROLLED: "Humidity Controlled",
  LIGHT_PROTECTED: "Light Protected",
  HAZARDOUS: "Hazardous / Controlled",
  OTHER: "Other",
};

// ─── Badge helpers ─────────────────────────────────────────────────────────────

export function lotStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "RELEASED": return "success";
    case "CONDITIONALLY_RELEASED": return "info";
    case "QUARANTINED":
    case "SAMPLING_PENDING":
    case "UNDER_QC_TESTING":
    case "QA_REVIEW_PENDING":
    case "ON_HOLD": return "warning";
    case "REJECTED":
    case "EXPIRED":
    case "RECALLED": return "error";
    case "CONSUMED":
    case "DISPOSED": return "neutral";
    default: return "neutral";
  }
}

export function materialStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "APPROVED": return "success";
    case "PENDING_APPROVAL": return "warning";
    case "DRAFT": return "neutral";
    case "ON_HOLD": return "warning";
    case "OBSOLETE":
    case "REJECTED": return "neutral";
    default: return "neutral";
  }
}

export function materialCriticalityVariant(c: string): BadgeVariant {
  switch (c) {
    case "CRITICAL": return "error";
    case "NON_CRITICAL": return "neutral";
    default: return "neutral";
  }
}

// ─── Lot usability helpers ────────────────────────────────────────────────────

export function lotIsUsable(status: string): boolean {
  return status === "RELEASED" || status === "CONDITIONALLY_RELEASED";
}

export function lotIsBlocked(status: string): boolean {
  return ["QUARANTINED", "REJECTED", "ON_HOLD", "EXPIRED", "RECALLED", "DISPOSED"].includes(status);
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
  // Extended fields
  category: string | null;
  criticality: string | null;
  intendedUse: string | null;
  grade: string | null;
  casNumber: string | null;
  specificationReference: string | null;
  standardStorageCondition: string | null;
  qcTestingRequired: boolean;
  samplingRequired: boolean;
  coaRequired: boolean;
  sdsRequired: boolean;
  approvedSupplierRequired: boolean;
  expiryDateRequired: boolean;
  retestDateRequired: boolean;
  quarantineRequiredOnReceipt: boolean;
  qaReleaseRequiredBeforeUse: boolean;
  riskAssessmentRequired: boolean;
  minimumStockLevel: number | null;
  maximumStockLevel: number | null;
  reorderLevel: number | null;
  reorderQuantity: number | null;
  fefoRequired: boolean;
  fifoRequired: boolean;
  defaultWarehouse: string | null;
  defaultStorageLocation: string | null;
}

export interface MaterialLot {
  id: number;
  materialId: number;
  internalLotNumber: string;
  supplierLotNumber: string | null;
  supplierId: number | null;
  manufacturer: string | null;
  purchaseOrderNumber: string | null;
  deliveryNoteNumber: string | null;
  receivedQuantity: number;
  acceptedQuantity: number | null;
  rejectedQuantity: number | null;
  remainingQuantity: number | null;
  unitOfMeasure: string;
  dateReceived: string | null;
  expiryDate: string | null;
  retestDate: string | null;
  storageLocation: string | null;
  lotStatus: string;
  releasedAt: string | null;
  rejectedAt: string | null;
  disposedAt: string | null;
  rejectionReason: string | null;
  holdReason: string | null;
  disposalReason: string | null;
  releaseConditions: string | null;
  createdAt: string;
}

export interface MaterialSupplierLink {
  id: number;
  materialId: number;
  supplierId: number;
  approvedForMaterial: boolean;
  scopeOfApproval: string | null;
  approvalConditions: string | null;
  effectiveDate: string | null;
  reviewDate: string | null;
  createdAt: string;
}

export interface MaterialInventoryLedger {
  id: number;
  materialId: number;
  materialLotId: number | null;
  transactionType: string;
  fromLocation: string | null;
  toLocation: string | null;
  quantityIn: number | null;
  quantityOut: number | null;
  balance: number | null;
  unitOfMeasure: string | null;
  referenceDocument: string | null;
  relatedRecordType: string | null;
  relatedRecordId: string | null;
  reason: string | null;
  transactionAt: string;
}

export interface MaterialQualityIssueLink {
  id: number;
  materialId: number;
  materialLotId: number | null;
  recordType: string;
  recordId: string;
  recordReference: string | null;
  recordTitle: string | null;
  recordStatus: string | null;
  notes: string | null;
  createdAt: string;
}
