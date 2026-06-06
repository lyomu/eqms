export type TrainingAudience = "ALL" | "QA" | "MANUFACTURING" | "ENGINEERING" | "WAREHOUSE" | "REGULATORY";
export type TrainingFrequency = "ON_HIRE" | "ANNUAL" | "BIENNIAL" | "AFTER_CHANGE";
export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";

export const AUDIENCE_LABELS: Record<TrainingAudience, string> = {
  ALL: "All",
  QA: "QA",
  MANUFACTURING: "Manufacturing",
  ENGINEERING: "Engineering",
  WAREHOUSE: "Warehouse",
  REGULATORY: "Regulatory",
};

export const FREQUENCY_LABELS: Record<TrainingFrequency, string> = {
  ON_HIRE: "On Hire",
  ANNUAL: "Annual",
  BIENNIAL: "Biennial",
  AFTER_CHANGE: "After Change",
};

export interface TrainingResponse {
  id: number;
  trainingCode: string;
  title: string;
  content: string;
  intendedAudience: TrainingAudience;
  requiredFrequency: TrainingFrequency;
  active: boolean;
  version: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
}

export interface TrainingAssignment {
  id: number;
  trainingProgramId: number;
  userId: number;
  assignedDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  status: AssignmentStatus;
  completionEvidence: string | null;
  version: number;
}

export interface TrainingRule {
  id: number;
  trainingProgramId: number;
  triggerEvent: string;
  targetAudience: TrainingAudience;
  dueWithinDays: number | null;
  createdAt: string;
}

export interface ComplianceStatus {
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRatePct: number;
}
