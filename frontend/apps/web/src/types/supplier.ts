export type SupplierStatus = "UNAPPROVED" | "QUALIFIED" | "CONDITIONAL";
export type SupplierType = "RAW_MATERIAL" | "PACKAGING" | "SERVICE";
export type FindingSeverity = "CRITICAL" | "MAJOR" | "MINOR";

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  QUALIFIED: "Approved",
  CONDITIONAL: "Conditional",
  UNAPPROVED: "Unapproved",
};

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  RAW_MATERIAL: "Raw Material",
  PACKAGING: "Packaging",
  SERVICE: "Service",
};

export interface SupplierResponse {
  id: number;
  supplierCode: string;
  supplierName: string;
  supplierType: SupplierType;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  location: string;
  status: SupplierStatus;
  version: number;
  qualificationDate: string | null;
  ownerId: number | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
}

export interface SupplierCertification {
  id: number;
  certType: string;
  issueDate: string | null;
  expiryDate: string | null;
  filePath: string | null;
  createdAt: string;
}

export interface SupplierPerformance {
  id: number;
  assessmentPeriodStart: string | null;
  assessmentPeriodEnd: string | null;
  onTimeDeliveryPct: number | null;
  qualityAcceptancePct: number | null;
  responsivenessRating: number | null;
  createdAt: string;
}

export interface SupplierQualification {
  id: number;
  assessmentMethod: string;
  assessmentDate: string | null;
  assessor: string | null;
  approvalStatus: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SupplierFinding {
  id: number;
  supplierId: number;
  findingDate: string | null;
  findingDescription: string;
  severity: FindingSeverity;
  rootCause: string | null;
  correctiveActionRequired: boolean;
  createdAt: string;
}
