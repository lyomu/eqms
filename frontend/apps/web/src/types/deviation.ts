/** Mirrors the backend Deviation contract (com.eqms.deviations). Base path: /api/deviations. */

// ─── Core enums ───────────────────────────────────────────────────────────────

export type DeviationStatus =
  | "DRAFT"
  | "REPORTED"
  | "UNDER_INVESTIGATION"
  | "INVESTIGATION_IN_PROGRESS"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED"
  | "REOPENED";

export type DeviationSeverity = "MINOR" | "MAJOR" | "CRITICAL";

export type DeviationType = "PLANNED" | "UNPLANNED";

export type DeviationRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DeviationCategory =
  | "PROCESS_DEVIATION"
  | "PROCEDURE_DEVIATION"
  | "PRODUCT_DEVIATION"
  | "MATERIAL_DEVIATION"
  | "EQUIPMENT_DEVIATION"
  | "LABORATORY_DEVIATION"
  | "CLEANING_DEVIATION"
  | "ENVIRONMENTAL_DEVIATION"
  | "DOCUMENTATION_DEVIATION"
  | "TRAINING_DEVIATION"
  | "SUPPLIER_DEVIATION"
  | "PACKAGING_DEVIATION"
  | "STORAGE_WAREHOUSE_DEVIATION"
  | "DATA_INTEGRITY_DEVIATION"
  | "SAFETY_DEVIATION"
  | "OTHER";

// ─── Label maps ───────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<DeviationStatus, string> = {
  DRAFT: "Draft",
  REPORTED: "Reported",
  UNDER_INVESTIGATION: "Under Investigation",
  INVESTIGATION_IN_PROGRESS: "Investigation In Progress",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  REOPENED: "Reopened",
};

/** @deprecated Use STATUS_LABELS */
export const DEVIATION_STATUS_LABELS = STATUS_LABELS;

export const SEVERITY_LABELS: Record<DeviationSeverity, string> = {
  MINOR: "Minor",
  MAJOR: "Major",
  CRITICAL: "Critical",
};

export const DEVIATION_TYPE_LABELS: Record<DeviationType, string> = {
  PLANNED: "Planned",
  UNPLANNED: "Unplanned",
};

export const CATEGORY_LABELS: Record<DeviationCategory, string> = {
  PROCESS_DEVIATION: "Process",
  PROCEDURE_DEVIATION: "Procedure",
  PRODUCT_DEVIATION: "Product",
  MATERIAL_DEVIATION: "Material",
  EQUIPMENT_DEVIATION: "Equipment",
  LABORATORY_DEVIATION: "Laboratory",
  CLEANING_DEVIATION: "Cleaning",
  ENVIRONMENTAL_DEVIATION: "Environmental",
  DOCUMENTATION_DEVIATION: "Documentation",
  TRAINING_DEVIATION: "Training",
  SUPPLIER_DEVIATION: "Supplier",
  PACKAGING_DEVIATION: "Packaging",
  STORAGE_WAREHOUSE_DEVIATION: "Storage / Warehouse",
  DATA_INTEGRITY_DEVIATION: "Data Integrity",
  SAFETY_DEVIATION: "Safety",
  OTHER: "Other",
};

export const RISK_LEVEL_LABELS: Record<DeviationRiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

// ─── Status class helpers (for inline styled spans, legacy) ───────────────────

export const DEVIATION_STATUS_CLASSES: Record<DeviationStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  REPORTED: "bg-accent text-accent-foreground",
  UNDER_INVESTIGATION: "bg-brand-light text-brand-primary",
  INVESTIGATION_IN_PROGRESS: "bg-brand-light text-brand-primary",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  APPROVED: "bg-success/15 text-success",
  CLOSED: "bg-success text-white",
  REJECTED: "bg-error/15 text-error",
  CANCELLED: "bg-slate-200 text-slate-700",
  REOPENED: "bg-warning/20 text-[#8A6D00]",
};

// ─── Badge variant helpers ────────────────────────────────────────────────────

/** Returns Badge variant for a deviation status. */
export function deviationStatusVariant(
  status: DeviationStatus
): "neutral" | "info" | "success" | "warning" | "error" {
  switch (status) {
    case "DRAFT":
    case "CANCELLED":
      return "neutral";
    case "REPORTED":
    case "UNDER_INVESTIGATION":
    case "INVESTIGATION_IN_PROGRESS":
      return "info";
    case "PENDING_APPROVAL":
    case "REOPENED":
      return "warning";
    case "APPROVED":
    case "CLOSED":
      return "success";
    case "REJECTED":
      return "error";
  }
}

/** Returns Badge variant for a deviation severity. */
export function deviationSeverityVariant(
  severity: DeviationSeverity
): "neutral" | "info" | "success" | "warning" | "error" {
  switch (severity) {
    case "MINOR":
      return "info";
    case "MAJOR":
      return "warning";
    case "CRITICAL":
      return "error";
  }
}

/** @deprecated Use deviationSeverityVariant */
export const SEVERITY_VARIANT: Record<
  DeviationSeverity,
  "error" | "warning" | "neutral"
> = {
  CRITICAL: "error",
  MAJOR: "warning",
  MINOR: "neutral",
};

/** Returns Badge variant for a risk level. */
export function deviationRiskVariant(
  level: DeviationRiskLevel | null | undefined
): "neutral" | "info" | "success" | "warning" | "error" {
  switch (level) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "warning";
    case "HIGH":
    case "CRITICAL":
      return "error";
    default:
      return "neutral";
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function ageInDays(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function investigationDueVariant(
  dev: Pick<DeviationResponse, "targetInvestigationDueDate" | "status">
): "neutral" | "info" | "success" | "warning" | "error" {
  const OPEN_STATUSES: DeviationStatus[] = [
    "DRAFT",
    "REPORTED",
    "UNDER_INVESTIGATION",
    "INVESTIGATION_IN_PROGRESS",
    "REOPENED",
  ];
  if (!dev.targetInvestigationDueDate) return "neutral";
  if (!OPEN_STATUSES.includes(dev.status)) return "neutral";
  const d = daysUntil(dev.targetInvestigationDueDate);
  if (d === null) return "neutral";
  if (d < 0) return "error";
  if (d <= 7) return "warning";
  return "success";
}

// ─── Main DeviationResponse interface ────────────────────────────────────────

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

  // NEW extended fields (may be null on older records)
  deviationType: DeviationType | null;
  category: DeviationCategory | null;
  relatedModule: string | null;
  department: string | null;
  site: string | null;
  location: string | null;
  dateDiscovered: string | null;
  dateReported: string | null;
  reportedById: number | null;
  ownerId: number | null;
  qaOwnerId: number | null;
  initialRiskLevel: DeviationRiskLevel | null;
  finalSeverity: DeviationSeverity | null;
  finalRiskLevel: DeviationRiskLevel | null;
  productAffected: boolean;
  materialAffected: boolean;
  batchAffected: boolean;
  equipmentAffected: boolean;
  supplierInvolved: boolean;
  customerImpactPossible: boolean;
  regulatoryImpactPossible: boolean;
  dataIntegrityImpactPossible: boolean;
  containmentRequired: boolean;
  investigationRequired: boolean;
  capaRequired: boolean;
  changeControlRequired: boolean;
  targetInvestigationDueDate: string | null;
  targetClosureDueDate: string | null;
  whatHappened: string | null;
  whereHappened: string | null;
  howDetected: string | null;
  whoInvolved: string | null;
  reopenReason: string | null;
  reopenedAt: string | null;
}

// ─── Sub-entity interfaces ────────────────────────────────────────────────────

export interface ContainmentActionResponse {
  id: number;
  deviationId: number;
  description: string;
  actionType: string; // CONTAINMENT | CORRECTION | PRODUCT_HOLD | EQUIPMENT_HOLD | PROCESS_STOP | SEGREGATION | QUARANTINE | NOTIFICATION | OTHER
  ownerId: number | null;
  dueDate: string | null;
  status: string; // NOT_STARTED | IN_PROGRESS | COMPLETED | OVERDUE | CANCELLED
  completionEvidence: string | null;
  completionDate: string | null;
  verifiedById: number | null;
  verificationDate: string | null;
  comments: string | null;
  createdAt: string;
}

export interface ImpactAssessmentResponse {
  id: number;
  deviationId: number;
  productQualityAffected: string | null; // YES | NO | UNKNOWN
  materialQualityAffected: string | null;
  processQualityAffected: string | null;
  specificationImpact: string | null;
  batchLotImpact: string | null;
  qualityComments: string | null;
  customerImpact: string | null;
  patientSafetyImpact: string | null;
  complaintRisk: string | null;
  recallRisk: string | null;
  safetyComments: string | null;
  regulatoryImpact: string | null;
  reportableEvent: string | null;
  inspectionAuditImpact: string | null;
  complianceComments: string | null;
  originalRecordAffected: string | null;
  missingIncompleteData: string | null;
  unauthorizedChange: string | null;
  traceabilityAffected: string | null;
  dataIntegrityComments: string | null;
  overallImpact: string | null; // NO_IMPACT | LOW_IMPACT | MEDIUM_IMPACT | HIGH_IMPACT | CRITICAL_IMPACT
  assessmentStatus: string;
  assessedById: number | null;
  assessmentDate: string | null;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviationInvestigationResponse {
  id: number;
  deviationId: number;
  status: string; // NOT_STARTED | IN_PROGRESS | PENDING_REVIEW | COMPLETED | REJECTED
  investigationOwnerId: number | null;
  startDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  summary: string | null;
  evidenceReviewed: string | null;
  rootCauseCategory: string | null; // HUMAN_ERROR | PROCESS_FAILURE | EQUIPMENT_FAILURE | MATERIAL_ISSUE | ...
  rootCauseDescription: string | null;
  contributingFactors: string | null;
  mostProbableRootCause: string | null;
  rootCauseConfirmed: boolean;
  analysisMethod: string | null; // FIVE_WHYS | FISHBONE | FAULT_TREE | PROCESS_MAPPING | HUMAN_ERROR_ANALYSIS | OTHER
  investigationConclusion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedRecordResponse {
  id: number;
  deviationId: number;
  linkedRecordType: string; // CAPA | RISK | CHANGE_CONTROL | OOS_OOT | NCR | COMPLAINT | AUDIT | SUPPLIER | EQUIPMENT | DOCUMENT | TRAINING | MATERIAL | PRODUCT | BATCH_RECORD
  linkedRecordId: number;
  linkedRecordNumber: string | null;
  notes: string | null;
  createdAt: string;
}
