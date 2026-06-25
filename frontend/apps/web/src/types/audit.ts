/**
 * Audit Management type definitions.
 * Mirrors the backend contract (com.eqms.audits). Base: /api/audits.
 */

// ─── Status / Type / Category enums ──────────────────────────────────────────

export type AuditStatus =
  | "DRAFT"
  | "PLANNED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "FINDINGS_REVIEW"
  | "REPORT_DRAFT"
  | "REPORT_SUBMITTED"
  | "REPORT_APPROVED"
  | "ACTION_PLAN_PENDING"
  | "FOLLOW_UP_IN_PROGRESS"
  | "PENDING_CLOSURE"
  | "CLOSED"
  | "REOPENED"
  | "COMPLETED"
  | "FOLLOW_UP"
  | "CANCELLED"
  | "ARCHIVED";

export type AuditTypeKey =
  | "INTERNAL"
  | "SUPPLIER"
  | "INTERNAL_QMS"
  | "PROCESS"
  | "PRODUCT"
  | "SUPPLIER_AUDIT"
  | "EQUIPMENT_AUDIT"
  | "LABORATORY"
  | "WAREHOUSE"
  | "DOCUMENT_CONTROL"
  | "TRAINING_AUDIT"
  | "DATA_INTEGRITY"
  | "REGULATORY_INSPECTION"
  | "CERTIFICATION"
  | "CUSTOMER"
  | "EXTERNAL"
  | "MOCK"
  | "OTHER";

export type AuditCategory =
  | "INTERNAL"
  | "EXTERNAL"
  | "SUPPLIER"
  | "REGULATORY"
  | "CUSTOMER"
  | "CERTIFICATION"
  | "MOCK";

export type FindingSeverity = "CRITICAL" | "MAJOR" | "MINOR";

export type FindingType =
  | "CONFORMITY"
  | "OBSERVATION"
  | "OPPORTUNITY_FOR_IMPROVEMENT"
  | "MINOR_NC"
  | "MAJOR_NC"
  | "CRITICAL_NC"
  | "GOOD_PRACTICE";

export type FindingStatus =
  | "DRAFT"
  | "ISSUED"
  | "ACKNOWLEDGED"
  | "RESPONSE_PENDING"
  | "ACTION_PLAN_SUBMITTED"
  | "ACTION_PLAN_APPROVED"
  | "IN_PROGRESS"
  | "VERIFICATION_PENDING"
  | "EFFECTIVENESS_CHECK_PENDING"
  | "CLOSED"
  | "REJECTED"
  | "REOPENED";

export type ActionPlanStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "VERIFIED"
  | "INEFFECTIVE"
  | "CLOSED"
  | "CANCELLED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FollowUpStatus = "CLOSED" | "STILL_OPEN";

// ─── Label maps ───────────────────────────────────────────────────────────────

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  DRAFT: "Draft",
  PLANNED: "Planned",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  FINDINGS_REVIEW: "Findings Review",
  REPORT_DRAFT: "Report Draft",
  REPORT_SUBMITTED: "Report Submitted",
  REPORT_APPROVED: "Report Approved",
  ACTION_PLAN_PENDING: "Action Plan Pending",
  FOLLOW_UP_IN_PROGRESS: "Follow-up In Progress",
  PENDING_CLOSURE: "Pending Closure",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  COMPLETED: "Completed",
  FOLLOW_UP: "Follow-up",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export const AUDIT_TYPE_LABELS: Record<AuditTypeKey, string> = {
  INTERNAL: "Internal",
  SUPPLIER: "Supplier",
  INTERNAL_QMS: "Internal QMS",
  PROCESS: "Process",
  PRODUCT: "Product",
  SUPPLIER_AUDIT: "Supplier Audit",
  EQUIPMENT_AUDIT: "Equipment Audit",
  LABORATORY: "Laboratory",
  WAREHOUSE: "Warehouse",
  DOCUMENT_CONTROL: "Document Control",
  TRAINING_AUDIT: "Training Audit",
  DATA_INTEGRITY: "Data Integrity",
  REGULATORY_INSPECTION: "Regulatory Inspection",
  CERTIFICATION: "Certification",
  CUSTOMER: "Customer",
  EXTERNAL: "External",
  MOCK: "Mock",
  OTHER: "Other",
};

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
  SUPPLIER: "Supplier",
  REGULATORY: "Regulatory",
  CUSTOMER: "Customer",
  CERTIFICATION: "Certification",
  MOCK: "Mock",
};

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  CONFORMITY: "Conformity",
  OBSERVATION: "Observation",
  OPPORTUNITY_FOR_IMPROVEMENT: "Opportunity for Improvement",
  MINOR_NC: "Minor NC",
  MAJOR_NC: "Major NC",
  CRITICAL_NC: "Critical NC",
  GOOD_PRACTICE: "Good Practice",
};

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  ACKNOWLEDGED: "Acknowledged",
  RESPONSE_PENDING: "Response Pending",
  ACTION_PLAN_SUBMITTED: "Action Plan Submitted",
  ACTION_PLAN_APPROVED: "Action Plan Approved",
  IN_PROGRESS: "In Progress",
  VERIFICATION_PENDING: "Verification Pending",
  EFFECTIVENESS_CHECK_PENDING: "Effectiveness Check Pending",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  REOPENED: "Reopened",
};

export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  CRITICAL: "Critical",
  MAJOR: "Major",
  MINOR: "Minor",
};

export const ACTION_PLAN_STATUS_LABELS: Record<ActionPlanStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  VERIFIED: "Verified",
  INEFFECTIVE: "Ineffective",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

// ─── Badge variant helpers ────────────────────────────────────────────────────

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "error";

export function auditStatusVariant(status: string): BadgeVariant {
  switch (status as AuditStatus) {
    case "DRAFT":
    case "PLANNED":
    case "SCHEDULED":
      return "neutral";
    case "IN_PROGRESS":
      return "info";
    case "FINDINGS_REVIEW":
    case "REPORT_DRAFT":
    case "REPORT_SUBMITTED":
      return "warning";
    case "REPORT_APPROVED":
      return "success";
    case "ACTION_PLAN_PENDING":
    case "FOLLOW_UP_IN_PROGRESS":
    case "PENDING_CLOSURE":
    case "REOPENED":
    case "FOLLOW_UP":
      return "warning";
    case "CLOSED":
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "ARCHIVED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function findingTypeVariant(type: string): BadgeVariant {
  switch (type as FindingType) {
    case "CONFORMITY":
    case "GOOD_PRACTICE":
      return "success";
    case "OBSERVATION":
    case "OPPORTUNITY_FOR_IMPROVEMENT":
      return "info";
    case "MINOR_NC":
      return "warning";
    case "MAJOR_NC":
    case "CRITICAL_NC":
      return "error";
    default:
      return "neutral";
  }
}

export function findingSeverityVariant(severity: string): BadgeVariant {
  switch (severity as FindingSeverity) {
    case "CRITICAL":
      return "error";
    case "MAJOR":
      return "warning";
    case "MINOR":
      return "neutral";
    default:
      return "neutral";
  }
}

export function findingStatusVariant(status: string): BadgeVariant {
  switch (status as FindingStatus) {
    case "CLOSED":
      return "success";
    case "ISSUED":
    case "IN_PROGRESS":
      return "info";
    case "DRAFT":
      return "neutral";
    case "REJECTED":
      return "error";
    case "REOPENED":
    case "RESPONSE_PENDING":
    case "VERIFICATION_PENDING":
    case "EFFECTIVENESS_CHECK_PENDING":
      return "warning";
    case "ACKNOWLEDGED":
    case "ACTION_PLAN_SUBMITTED":
    case "ACTION_PLAN_APPROVED":
      return "info";
    default:
      return "neutral";
  }
}

export function actionPlanStatusVariant(status: string): BadgeVariant {
  switch (status as ActionPlanStatus) {
    case "NOT_STARTED":
      return "neutral";
    case "IN_PROGRESS":
      return "info";
    case "COMPLETED":
    case "VERIFIED":
      return "success";
    case "OVERDUE":
    case "INEFFECTIVE":
      return "error";
    case "CLOSED":
    case "CANCELLED":
      return "neutral";
    default:
      return "neutral";
  }
}

export function riskLevelVariant(level: string): BadgeVariant {
  switch (level as RiskLevel) {
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

// ─── Helper functions ─────────────────────────────────────────────────────────

export function ageInDays(isoDate: string | null | undefined): number {
  if (!isoDate) return 0;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

export function auditOverdueCheck(audit: {
  plannedEndDate: string | null;
  status: string;
}): boolean {
  if (!audit.plannedEndDate) return false;
  const closed: AuditStatus[] = ["CLOSED", "COMPLETED", "CANCELLED", "ARCHIVED"];
  if (closed.includes(audit.status as AuditStatus)) return false;
  return new Date(audit.plannedEndDate).getTime() < Date.now();
}

export function findingOverdue(finding: {
  dueDate: string | null;
  findingStatus: string;
}): boolean {
  if (!finding.dueDate) return false;
  if (finding.findingStatus === "CLOSED" || finding.findingStatus === "REJECTED") return false;
  return new Date(finding.dueDate).getTime() < Date.now();
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AuditFinding {
  id: number;
  auditId: number;
  findingNumber: number | null;
  findingCode: string | null;
  title: string | null;
  description: string;
  findingType: FindingType | null;
  area: string | null;
  severity: FindingSeverity;
  riskLevel: string | null;
  requirementReference: string | null;
  evidence: string | null;
  rootCause: string | null;
  correctiveActionRequired: boolean;
  immediateCorrectionRequired: boolean;
  rootCauseRequired: boolean;
  capaRequired: boolean;
  responsibleOwnerId: number | null;
  dueDate: string | null;
  findingStatus: FindingStatus;
  recurrenceFlag: boolean;
  closedById: number | null;
  closedAt: string | null;
  closureComments: string | null;
  createdAt: string;
  createdBy: number | null;
}

export interface AuditChecklistItem {
  id: number;
  auditId: number;
  section: string | null;
  requirementReference: string | null;
  question: string;
  expectedEvidence: string | null;
  checklistMethod: string | null;
  responsibleAuditorId: number | null;
  applicable: boolean;
  response: string | null;
  evidenceSummary: string | null;
  findingRequired: boolean;
  linkedFindingId: number | null;
  comments: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface AuditEvidence {
  id: number;
  auditId: number;
  evidenceType: string;
  description: string;
  referenceNumber: string | null;
  areaAudited: string | null;
  personInterviewed: string | null;
  recordsReviewed: string | null;
  relatedChecklistItemId: number | null;
  relatedFindingId: number | null;
  auditorNotes: string | null;
  createdAt: string;
}

export interface AuditActionPlan {
  id: number;
  auditId: number;
  findingId: number | null;
  actionType: string;
  description: string;
  rootCauseAnalysis: string | null;
  actionOwnerId: number | null;
  dueDate: string | null;
  priority: string | null;
  status: ActionPlanStatus;
  completionEvidence: string | null;
  completedById: number | null;
  completionDate: string | null;
  verifiedById: number | null;
  verificationDate: string | null;
  effectivenessCheckRequired: boolean;
  effectivenessCheckDate: string | null;
  effectivenessResult: string | null;
  comments: string | null;
  createdAt: string;
}

export interface AuditMeeting {
  id: number;
  auditId: number;
  meetingType: string;
  meetingDateTime: string | null;
  attendees: string | null;
  agenda: string | null;
  discussionSummary: string | null;
  keyDecisions: string | null;
  agreedActions: string | null;
  minutesApproved: boolean;
  approvedById: number | null;
  approvalDate: string | null;
  createdAt: string;
}

export interface AuditLinkedRecord {
  id: number;
  auditId: number;
  recordType: string;
  recordId: string;
  recordReference: string | null;
  recordTitle: string | null;
  recordStatus: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AuditFollowUp {
  id: number;
  currentAuditId: number;
  previousAuditId: number | null;
  findingId: number | null;
  status: FollowUpStatus;
  notes: string | null;
  createdAt: string;
}

export interface AuditResponse {
  id: number;
  auditNo: string;
  auditTitle: string;
  auditType: string;
  auditCategory: string | null;
  status: AuditStatus;
  objective: string | null;
  scope: string | null;
  criteria: string | null;
  department: string | null;
  processArea: string | null;
  site: string | null;
  relatedModule: string | null;
  riskLevel: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  auditDate: string | null;
  auditorId: number | null;
  leadAuditorId: number | null;
  auditTeamMembers: string | null;
  auditeeId: number | null;
  auditeeOwnerId: number | null;
  auditSponsorId: number | null;
  method: string | null;
  frequency: string | null;
  reasonForAudit: string | null;
  previousAuditId: number | null;
  checklistRequired: boolean;
  openingMeetingRequired: boolean;
  closingMeetingRequired: boolean;
  auditorIndependenceConfirmed: boolean;
  closureStatus: string | null;
  closedById: number | null;
  closedAt: string | null;
  closureComments: string | null;
  submittedBy: number | null;
  completedDate: string | null;
  version: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  findings: AuditFinding[];
}

// Legacy status classes — kept for backward compat, prefer auditStatusVariant()
export const AUDIT_STATUS_CLASSES: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-brand-light text-brand-primary",
  COMPLETED: "bg-success text-white",
  CLOSED: "bg-success text-white",
  FOLLOW_UP: "bg-warning/20 text-[#8A6D00]",
  CANCELLED: "bg-slate-200 text-slate-700",
};
