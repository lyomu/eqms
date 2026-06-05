/** Mirrors the backend dashboard contract (com.eqms.dashboard.dto). Read-only. */

/** GET /api/dashboard/my-work — actionable summary counts for the current user. */
export interface MyWork {
  pendingApprovals: number;
  myDueDatedTasks: number;
  unreadNotifications: number;
}

/**
 * A single actionable item. `module` is a backend enum-ish key
 * (Document | ChangeControl | Capa | Deviation | Material | Product | BatchRecord);
 * `status` is the record's status enum name; `dueDate` may be null.
 */
export interface TaskItem {
  module: string;
  recordId: number | null;
  recordNumber: string;
  status: string;
  dueDate: string | null;
}

/** GET /api/dashboard/my-approvals — records awaiting the current user's approval. */
export interface PendingApprovals {
  total: number;
  byModule: Record<string, number>;
  items: TaskItem[];
}

/** GET /api/dashboard/statistics — system-wide counts. */
export interface DashboardStatistics {
  totalDocuments: number;
  effectiveDocuments: number;
  totalChangeControls: number;
  openChangeControls: number;
  totalCapas: number;
  openCapas: number;
  totalDeviations: number;
  openDeviations: number;
  totalProducts: number;
  activeProducts: number;
  totalMaterials: number;
  approvedMaterials: number;
  totalBatchRecords: number;
  releasedBatchRecords: number;
}

/** GET /api/dashboard/compliance-status — high-level compliance posture. */
export interface ComplianceStatus {
  documentsDueForReview: number;
  overdueCapas: number;
  overdueChangeControls: number;
  openDeviations: number;
  quarantinedBatches: number;
}

/** Human-readable labels for the backend `module` keys. */
export const MODULE_LABELS: Record<string, string> = {
  Document: "Document",
  ChangeControl: "Change Control",
  Capa: "CAPA",
  Deviation: "Deviation",
  Material: "Material",
  Product: "Product",
  BatchRecord: "Batch Record",
};
