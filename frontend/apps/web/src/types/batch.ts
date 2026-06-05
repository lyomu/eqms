/** Mirrors the backend Electronic Batch Records contract (com.eqms.batchrecords). Base: /api/batch-records. */

export type BatchStatus = "IN_PROGRESS" | "QA_REVIEW" | "RELEASED" | "REJECTED" | "QUARANTINE" | "RECALLED";
export type QcTestStatus = "PASS" | "FAIL" | "OOS";

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  IN_PROGRESS: "In Progress",
  QA_REVIEW: "QA Review",
  RELEASED: "Released",
  REJECTED: "Rejected",
  QUARANTINE: "Quarantine",
  RECALLED: "Recalled",
};

export const BATCH_STATUS_CLASSES: Record<BatchStatus, string> = {
  IN_PROGRESS: "bg-brand-light text-brand-primary",
  QA_REVIEW: "bg-warning/20 text-[#8A6D00]",
  RELEASED: "bg-success text-white",
  REJECTED: "bg-error/15 text-error",
  QUARANTINE: "bg-warning/20 text-[#8A6D00]",
  RECALLED: "bg-error/15 text-error",
};

export const QC_STATUS_VARIANT: Record<QcTestStatus, "success" | "error" | "warning"> = {
  PASS: "success",
  FAIL: "error",
  OOS: "warning",
};

export interface BatchProductionStep {
  id: number;
  batchRecordId: number;
  stepNumber: number;
  stepDescription: string;
  equipmentUsed: string | null;
  operatorId: number | null;
  startTime: string | null;
  endTime: string | null;
  parametersRecorded: string | null;
  anomaliesNoted: string | null;
  createdAt: string;
  createdBy: number | null;
}

export interface QcResult {
  id: number;
  testMethod: string;
  specificationLimit: string;
  actualResult: string;
  testDate: string | null;
  testStatus: QcTestStatus;
  testLab: string | null;
  approvedBy: number | null;
}

export interface BatchRecordResponse {
  id: number;
  batchNo: string;
  productId: number | null;
  productCode: string;
  batchSize: number;
  unit: string;
  manufacturingStartDate: string | null;
  manufacturingEndDate: string | null;
  notes: string | null;
  status: BatchStatus;
  version: number;
  submittedBy: number | null;
  releasedBy: number | null;
  releasedAt: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  productionSteps: BatchProductionStep[];
  qcResults: QcResult[];
}

export interface MaterialEntry {
  id: number;
  materialId: number | null;
  materialCode: string;
  lotNumber: string;
  supplier: string | null;
  quantityUsed: number;
  unit: string;
  createdAt: string;
}

export interface ProductEntry {
  id: number;
  productId: number | null;
  productCode: string;
  lotNumberAssigned: string;
  quantity: number;
  unit: string;
  createdAt: string;
}

export interface BatchTraceability {
  batchRecordId: number;
  batchNo: string;
  productCode: string;
  materialsUsed: MaterialEntry[];
  productsProduced: ProductEntry[];
}
