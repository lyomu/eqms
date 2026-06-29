/** Mirrors the backend Product Management contract (com.eqms.products). Base path: /api/products. */

export type ProductStatus = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "ON_HOLD" | "DISCONTINUED" | "REJECTED";

export type DosageForm = "TABLET" | "CAPSULE" | "INJECTION" | "SYRUP" | "CREAM" | "OINTMENT" | "INHALER" | "OTHER";

export type ProductCriticality = "CRITICAL" | "MAJOR" | "MINOR";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Under Review",
  ACTIVE: "Active",
  ON_HOLD: "Suspended",
  DISCONTINUED: "Obsolete",
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

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL_PRODUCT: "Raw Material Product",
  INTERMEDIATE_PRODUCT: "Intermediate Product",
  FINISHED_PRODUCT: "Finished Product",
  PACKAGING_PRODUCT: "Packaging Product",
  SERVICE_PRODUCT: "Service Product",
  KIT_BUNDLE: "Kit/Bundle",
  OTHER: "Other",
};

export const PRODUCT_CRITICALITY_LABELS: Record<ProductCriticality, string> = {
  CRITICAL: "Critical",
  MAJOR: "Major",
  MINOR: "Minor",
};

export interface ProductResponse {
  id: number;
  productCode: string;
  name: string;
  dosageForm: DosageForm;
  productType: string | null;
  category: string | null;
  strength: string | null;
  description: string | null;
  intendedUse: string | null;
  criticality: ProductCriticality;
  ownerId: number | null;
  department: string | null;
  siteLocation: string | null;
  revision: string | null;
  specificationReference: string | null;
  specificationStatus: string | null;
  storageRequirements: string | null;
  shelfLife: string | null;
  expiryRequired: boolean;
  qcTestingRequired: boolean;
  batchLotTrackingRequired: boolean;
  regulatoryCustomerRequirements: string | null;
  notes: string | null;
  registrationNumber: string | null;
  status: ProductStatus;
  approvedBy: number | null;
  approvedAt: string | null;
  nextReviewDate: string | null;
  version: number;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  underReviewProducts: number;
  obsoleteProducts: number;
  productsWithOpenQualityIssues: number;
}

export interface ProductEvidence {
  id: number;
  values: Record<string, unknown>;
  createdAt: string;
  createdBy: number | null;
}

export interface ProductApprovalHistory {
  id: number;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: number | null;
  actorName: string | null;
  comment: string | null;
  actionAt: string;
}

export interface ProductTraceability {
  product: ProductResponse;
  specifications: ProductEvidence[];
  materials: ProductEvidence[];
  documents: ProductEvidence[];
  batches: ProductEvidence[];
  qualityIssues: ProductEvidence[];
  risks: ProductEvidence[];
  changeControls: ProductEvidence[];
}

export interface IsoReadinessItem {
  code: string;
  label: string;
  status: "PASS" | "FAIL";
  severity: "HIGH" | "MEDIUM" | "LOW" | string;
  required: boolean;
  evidenceCount: number;
  message: string;
}

export interface IsoReadiness {
  recordType: string;
  recordId: string;
  ready: boolean;
  score: number;
  items: IsoReadinessItem[];
  blockingMessages: string[];
}
