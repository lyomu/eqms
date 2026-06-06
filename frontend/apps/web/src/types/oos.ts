/** Mirrors the backend OOS Management contract (com.eqms.oosmanagement). Base: /api/oos. */

export type OosStatus = "REPORTED" | "INITIAL_ASSESSMENT" | "AWAITING_REPEAT" | "INVESTIGATING" | "DISPOSITION_DETERMINED" | "CLOSED";
export type LikelyCause = "TESTING_ERROR" | "SAMPLE_HANDLING" | "PRODUCT_QUALITY" | "METHOD_ISSUE";
export type OosDisposition = "ACCEPT" | "REJECT" | "INVESTIGATE";
export type RepeatTestResult = "PASS" | "FAIL";

export const OOS_STATUS_LABELS: Record<OosStatus, string> = {
  REPORTED: "Reported",
  INITIAL_ASSESSMENT: "Initial Assessment",
  AWAITING_REPEAT: "Awaiting Repeat",
  INVESTIGATING: "Investigating",
  DISPOSITION_DETERMINED: "Disposition Determined",
  CLOSED: "Closed",
};

export const OOS_STATUS_CLASSES: Record<OosStatus, string> = {
  REPORTED: "bg-muted text-muted-foreground",
  INITIAL_ASSESSMENT: "bg-brand-light text-brand-primary",
  AWAITING_REPEAT: "bg-warning/20 text-[#8A6D00]",
  INVESTIGATING: "bg-brand-light text-brand-primary",
  DISPOSITION_DETERMINED: "bg-success/15 text-success",
  CLOSED: "bg-success text-white",
};

export const LIKELY_CAUSE_LABELS: Record<LikelyCause, string> = {
  TESTING_ERROR: "Testing Error",
  SAMPLE_HANDLING: "Sample Handling",
  PRODUCT_QUALITY: "Product Quality",
  METHOD_ISSUE: "Method Issue",
};

export interface OosInitialAssessment {
  assessmentFindings: string | null;
  likelyCause: string | null;
  assessorId: number | null;
  assessmentDate: string | null;
}
export interface OosRepeatTesting {
  repeatOrderedDate: string | null;
  repeatResult: string | null;
  repeatTestDate: string | null;
  testTechnicianId: number | null;
  testTechnicianName: string | null;
  notes: string | null;
}
export interface OosInvestigation {
  investigationFindings: string | null;
  rootCause: string | null;
  rootCauseMethod: string | null;
  investigatorId: number | null;
  investigationDate: string | null;
}
export interface OosDispositionDetail {
  disposition: string;
  rationale: string | null;
  approvedBy: number | null;
  approvedDate: string | null;
}

export interface OosCaseResponse {
  id: number;
  oosNo: string;
  productId: number | null;
  testMethod: string | null;
  specificationLimitMin: number | null;
  specificationLimitMax: number | null;
  reportedResult: string;
  reportedDate: string | null;
  reportedById: number | null;
  reportedByName: string | null;
  status: OosStatus;
  submittedBy: number | null;
  closedDate: string | null;
  version: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  initialAssessment: OosInitialAssessment | null;
  repeatTesting: OosRepeatTesting | null;
  investigation: OosInvestigation | null;
  disposition: OosDispositionDetail | null;
  linkedCapaIds: number[];
}
