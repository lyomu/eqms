export type MrStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type MetricTrend = "UP" | "DOWN" | "STABLE";

export const MR_STATUS_LABELS: Record<MrStatus, string> = { SCHEDULED: "Scheduled", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };

export interface ReviewMetric { metricName: string; metricValue: string; period: string | null; trend: MetricTrend | null }
export interface ReviewAuditResult { auditId: number; criticalFindings: number | null; majorFindings: number | null; minorFindings: number | null }
export interface ReviewProductFeedback { complaintsCount: number | null; returnsCount: number | null; seriousAdverseEvents: number | null }
export interface ReviewActionItem { id: number; managementReviewId: number; actionDescription: string; ownerId: number | null; dueDate: string | null; status: "OPEN" | "COMPLETED"; completionDate: string | null }
export interface ReviewDecision { decisionDescription: string; decisionArea: string | null; impact: string | null; documentedBy: number | null; documentedDate: string | null }

export interface ManagementReviewResponse {
  id: number; reviewNo: string; reviewDate: string; participants: string | null; scope: string | null; status: MrStatus;
  submittedBy: number | null; approvedDate: string | null; version: number; createdAt: string; createdBy: number | null; updatedAt: string;
  metrics: ReviewMetric[]; auditResults: ReviewAuditResult[]; productFeedback: ReviewProductFeedback[]; actionItems: ReviewActionItem[]; decisions: ReviewDecision[];
}
