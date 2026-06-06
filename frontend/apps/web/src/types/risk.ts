/** Mirrors the backend Risk Management contract (com.eqms.risks). Base: /api/risks. */

export type RiskStatus = "IDENTIFIED" | "ANALYZED" | "MITIGATED" | "ACCEPTED" | "CLOSED" | "CANCELLED";
export type RiskCategory = "PRODUCT" | "PROCESS" | "EQUIPMENT" | "ORGANIZATION";
export type AnalysisMethod = "FMEA" | "FISHBONE" | "HAZOP";
export type ControlType = "DESIGN" | "PROCESS" | "MONITORING";

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  IDENTIFIED: "Identified",
  ANALYZED: "Analyzed",
  MITIGATED: "Mitigated",
  ACCEPTED: "Accepted",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const RISK_STATUS_CLASSES: Record<RiskStatus, string> = {
  IDENTIFIED: "bg-muted text-muted-foreground",
  ANALYZED: "bg-brand-light text-brand-primary",
  MITIGATED: "bg-success/15 text-success",
  ACCEPTED: "bg-success text-white",
  CLOSED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export const CATEGORY_LABELS: Record<RiskCategory, string> = {
  PRODUCT: "Product",
  PROCESS: "Process",
  EQUIPMENT: "Equipment",
  ORGANIZATION: "Organization",
};

/** Risk-score color band (score is 1–25 = severity × probability). */
export function riskScoreClass(score: number | null | undefined): string {
  if (!score) return "bg-muted text-muted-foreground";
  if (score >= 15) return "bg-error/15 text-error";
  if (score >= 8) return "bg-warning/20 text-[#8A6D00]";
  return "bg-success/15 text-success";
}

export interface RiskAnalysis {
  analysisMethod: string;
  findings: string | null;
  consequence: string | null;
  severity: number | null;
  probability: number | null;
  residualRiskScore: number | null;
}

export interface RiskMitigation {
  id: number;
  riskId: number;
  controlDescription: string;
  controlType: string;
  ownerId: number | null;
  implementationDate: string | null;
  verificationMethod: string | null;
  createdAt: string;
}

export interface RiskEffectiveness {
  verificationDate: string | null;
  verifiedBy: number | null;
  residualRiskAcceptable: boolean;
  evidence: string | null;
}

export interface RiskResponse {
  id: number;
  riskNo: string;
  title: string;
  description: string;
  category: RiskCategory;
  potentialImpact: string;
  likelihood: number | null;
  riskScore: number | null;
  status: RiskStatus;
  version: number;
  ownerId: number | null;
  submittedBy: number | null;
  acceptedBy: number | null;
  acceptedDate: string | null;
  closedDate: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  analysis: RiskAnalysis | null;
  mitigations: RiskMitigation[];
  effectivenessChecks: RiskEffectiveness[];
}
