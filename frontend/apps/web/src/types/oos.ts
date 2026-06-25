/** Mirrors the backend OOS Management contract. Base: /api/oos. */

export type OosStatus =
  | "DRAFT"
  | "REPORTED"
  | "INITIAL_ASSESSMENT"
  | "AWAITING_REPEAT"
  | "INVESTIGATING"
  | "DISPOSITION_DETERMINED"
  | "CLOSED"
  | "LAB_INVESTIGATION"
  | "QA_REVIEW"
  | "RETEST_PENDING"
  | "RESAMPLE_PENDING"
  | "CAPA_REQUIRED"
  | "DISPOSITION_PENDING"
  | "REOPENED"
  | "CANCELLED";

export type OosRecordType = "OOS" | "OOT" | "ATYPICAL_RESULT";
export type OosSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OosTestCategory =
  | "CHEMICAL"
  | "MICROBIOLOGICAL"
  | "PHYSICAL"
  | "WATER_TESTING"
  | "DISSOLUTION"
  | "CONTENT_UNIFORMITY"
  | "STABILITY"
  | "ENVIRONMENTAL_MONITORING"
  | "OTHER";
export type OosSampleType = "ROUTINE" | "STABILITY" | "IN_PROCESS" | "RETAIN" | "REPEAT" | "RESAMPLE" | "REFERENCE";
export type OosHoldTarget = "BATCH" | "LOT" | "PRODUCT" | "EQUIPMENT" | "MATERIAL" | "NONE";
export type OosInitialAssessmentOutcome = "LAB_ERROR_CONFIRMED" | "NO_LAB_ERROR_FOUND" | "INCONCLUSIVE";
export type OosInvestigationStatus = "NOT_STARTED" | "IN_PROGRESS" | "PENDING_QA_REVIEW" | "COMPLETED";
export type OosRetestType = "RETEST" | "RESAMPLE";
export type OosRetestStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type OosImpactRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OosRootCauseCategory = "MAN" | "METHOD" | "MACHINE" | "MATERIAL" | "MEASUREMENT" | "ENVIRONMENT";
export type OosRootCauseMethod = "FISHBONE" | "FIVE_WHYS" | "FMEA" | "FAULT_TREE" | "PARETO" | "OTHER";
export type OosQaDecision = "ACCEPT" | "REJECT" | "CONDITIONAL_RELEASE" | "DESTROY" | "REWORK" | "REPROCESS";
export type OosLinkedRecordType = "CAPA" | "DEVIATION" | "CHANGE_CONTROL" | "COMPLAINT" | "AUDIT" | "RISK" | "BATCH_RECORD" | "SUPPLIER_FINDING";
export type OosEvidenceType = "CHROMATOGRAM" | "SPECTRA" | "RAW_DATA" | "PHOTO" | "CALCULATION" | "LOGBOOK_ENTRY" | "EQUIPMENT_LOG" | "WITNESS_STATEMENT" | "OTHER";
export type OosEvidenceStatus = "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
export type OosContainmentStatus = "DRAFT" | "APPLIED" | "RELEASED";
export type OosInvestigationItemType = "OBSERVATION" | "FINDING" | "TEST_RESULT" | "WITNESS_STATEMENT" | "EQUIPMENT_CHECK" | "DOCUMENT_REVIEW";
export type OosInvestigationItemStatus = "OPEN" | "CLOSED" | "NOT_APPLICABLE";
export type LikelyCause = "TESTING_ERROR" | "SAMPLE_HANDLING" | "PRODUCT_QUALITY" | "METHOD_ISSUE";
export type OosDisposition = "ACCEPT" | "REJECT" | "INVESTIGATE";
export type RepeatTestResult = "PASS" | "FAIL";

export const OOS_STATUS_LABELS: Record<OosStatus, string> = {
  DRAFT: "Draft",
  REPORTED: "Reported",
  INITIAL_ASSESSMENT: "Initial Assessment",
  AWAITING_REPEAT: "Awaiting Repeat",
  INVESTIGATING: "Investigating",
  DISPOSITION_DETERMINED: "Disposition Determined",
  CLOSED: "Closed",
  LAB_INVESTIGATION: "Lab Investigation",
  QA_REVIEW: "QA Review",
  RETEST_PENDING: "Retest Pending",
  RESAMPLE_PENDING: "Resample Pending",
  CAPA_REQUIRED: "CAPA Required",
  DISPOSITION_PENDING: "Disposition Pending",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

export const OOS_STATUS_VARIANT: Record<OosStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  DRAFT: "neutral",
  REPORTED: "info",
  INITIAL_ASSESSMENT: "info",
  AWAITING_REPEAT: "warning",
  INVESTIGATING: "warning",
  DISPOSITION_DETERMINED: "success",
  CLOSED: "success",
  LAB_INVESTIGATION: "warning",
  QA_REVIEW: "info",
  RETEST_PENDING: "warning",
  RESAMPLE_PENDING: "warning",
  CAPA_REQUIRED: "error",
  DISPOSITION_PENDING: "info",
  REOPENED: "warning",
  CANCELLED: "neutral",
};

export const OOS_RECORD_TYPE_LABELS: Record<OosRecordType, string> = {
  OOS: "Out of Specification",
  OOT: "Out of Trend",
  ATYPICAL_RESULT: "Atypical Result",
};

export const OOS_SEVERITY_LABELS: Record<OosSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const OOS_SEVERITY_VARIANT: Record<OosSeverity, "neutral" | "info" | "success" | "warning" | "error"> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "error",
};

export const OOS_TEST_CATEGORY_LABELS: Record<OosTestCategory, string> = {
  CHEMICAL: "Chemical",
  MICROBIOLOGICAL: "Microbiological",
  PHYSICAL: "Physical",
  WATER_TESTING: "Water Testing",
  DISSOLUTION: "Dissolution",
  CONTENT_UNIFORMITY: "Content Uniformity",
  STABILITY: "Stability",
  ENVIRONMENTAL_MONITORING: "Environmental Monitoring",
  OTHER: "Other",
};

export const OOS_SAMPLE_TYPE_LABELS: Record<OosSampleType, string> = {
  ROUTINE: "Routine",
  STABILITY: "Stability",
  IN_PROCESS: "In-Process",
  RETAIN: "Retain",
  REPEAT: "Repeat",
  RESAMPLE: "Resample",
  REFERENCE: "Reference",
};

export const OOS_QA_DECISION_LABELS: Record<OosQaDecision, string> = {
  ACCEPT: "Accept",
  REJECT: "Reject",
  CONDITIONAL_RELEASE: "Conditional Release",
  DESTROY: "Destroy",
  REWORK: "Rework",
  REPROCESS: "Reprocess",
};

export const OOS_ROOT_CAUSE_CATEGORY_LABELS: Record<OosRootCauseCategory, string> = {
  MAN: "Man / Personnel",
  METHOD: "Method",
  MACHINE: "Machine / Equipment",
  MATERIAL: "Material",
  MEASUREMENT: "Measurement",
  ENVIRONMENT: "Environment",
};

export const OOS_IMPACT_RISK_LABELS: Record<OosImpactRiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const LIKELY_CAUSE_LABELS: Record<LikelyCause, string> = {
  TESTING_ERROR: "Testing Error",
  SAMPLE_HANDLING: "Sample Handling",
  PRODUCT_QUALITY: "Product Quality",
  METHOD_ISSUE: "Method Issue",
};

// Interfaces for sub-entities
export interface OosInitialAssessment {
  assessmentFindings: string | null;
  likelyCause: string | null;
  assessorId: number | null;
  assessmentDate: string | null;
  labSupervisorId: number | null;
  labSupervisorReview: string | null;
  assessmentOutcome: OosInitialAssessmentOutcome | null;
  labErrorDescription: string | null;
  assessmentStartedDate: string | null;
  assessmentCompletedDate: string | null;
  assessmentComments: string | null;
  labErrorSuspected: boolean | null;
  correctSampleTested: boolean | null;
  correctTestMethodUsed: boolean | null;
  correctSpecificationApplied: boolean | null;
  calculationsChecked: boolean | null;
  dilutionsChecked: boolean | null;
  systemSuitabilityChecked: boolean | null;
  instrumentCalibrationValid: boolean | null;
  instrumentPerformanceAcceptable: boolean | null;
  reagentsStandardsValid: boolean | null;
  analystFollowedProcedure: boolean | null;
  environmentalConditionsAcceptable: boolean | null;
  samplePreparationChecked: boolean | null;
  rawDataReviewed: boolean | null;
  transcriptionChecked: boolean | null;
  previousResultsReviewed: boolean | null;
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
  investigationScope: string | null;
  investigationPlan: string | null;
  investigationStatus: OosInvestigationStatus | null;
  investigationOwnerId: number | null;
  investigationTeam: string | null;
  investigationStartDate: string | null;
  investigationDueDate: string | null;
  investigationCompletionDate: string | null;
  investigationFindings: string | null;
  rootCause: string | null;
  rootCauseMethod: string | null;
  investigatorId: number | null;
  investigationDate: string | null;
}

export interface OosDispositionDetail {
  disposition: string;
  rationale: string | null;
  qaDecision: OosQaDecision | null;
  finalConclusion: string | null;
  dispositionQuantity: number | null;
  affectedLots: string | null;
  conditionsOfRelease: string | null;
  closureComments: string | null;
  approvedBy: number | null;
  approvedDate: string | null;
  closedById: number | null;
}

export interface OosContainmentDetail {
  id: number;
  holdRequired: boolean;
  holdType: string | null;
  holdTarget: OosHoldTarget | null;
  targetReference: string | null;
  holdReason: string | null;
  holdAppliedAt: string | null;
  holdAppliedBy: number | null;
  holdReleasedAt: string | null;
  holdReleasedBy: number | null;
  immediateActions: string | null;
  notificationIssued: boolean;
  regulatoryNotificationRequired: boolean;
  customerNotificationRequired: boolean;
  notes: string | null;
  containmentStatus: OosContainmentStatus;
}

export interface OosInvestigationItem {
  id: number;
  itemType: OosInvestigationItemType;
  itemNumber: number;
  description: string;
  finding: string | null;
  source: string | null;
  evidenceRef: string | null;
  performedById: number | null;
  performedDate: string | null;
  itemStatus: OosInvestigationItemStatus;
}

export interface OosRetestResampleItem {
  id: number;
  testType: OosRetestType;
  testNumber: number;
  orderedById: number | null;
  orderedDate: string | null;
  rationale: string | null;
  sampleReference: string | null;
  analystId: number | null;
  performedDate: string | null;
  result: string | null;
  resultPass: boolean | null;
  equipmentUsed: string | null;
  analystComments: string | null;
  reviewerId: number | null;
  reviewedDate: string | null;
  testStatus: OosRetestStatus;
}

export interface OosImpactAssessmentDetail {
  id: number;
  scopeOfImpact: string | null;
  batchesPotentiallyAffected: string | null;
  productsPotentiallyAffected: string | null;
  releasedProductImpact: boolean;
  customerImpact: boolean;
  regulatoryImpact: boolean;
  patientSafetyRisk: OosImpactRiskLevel | null;
  riskJustification: string | null;
  quarantineRequired: boolean;
  recallRequired: boolean;
  authorityNotificationRequired: boolean;
  authorityNotifiedAt: string | null;
  authorityNotifiedBy: number | null;
  assessedById: number | null;
  assessedDate: string | null;
}

export interface OosRootCauseDetail {
  id: number;
  rootCauseCategory: OosRootCauseCategory | null;
  rootCauseDescription: string | null;
  rootCauseMethod: OosRootCauseMethod | null;
  contributingFactors: string | null;
  immediateCause: string | null;
  systematicIssue: boolean;
  recurrencePrevention: string | null;
  assessedById: number | null;
  assessedDate: string | null;
  reviewedById: number | null;
  reviewedDate: string | null;
}

export interface OosLinkedRecordItem {
  id: number;
  linkedRecordType: OosLinkedRecordType;
  linkedRecordId: string;
  linkedRecordReference: string | null;
  linkedRecordTitle: string | null;
  linkedRecordStatus: string | null;
  relationshipType: string | null;
  notes: string | null;
  addedBy: number | null;
  createdAt: string;
}

export interface OosEvidenceItem {
  id: number;
  evidenceType: OosEvidenceType;
  evidenceNumber: number;
  title: string;
  description: string | null;
  fileName: string | null;
  fileSize: number | null;
  contentType: string | null;
  attachmentId: number | null;
  submittedBy: number | null;
  submittedDate: string | null;
  evidenceStatus: OosEvidenceStatus;
  reviewedBy: number | null;
  reviewedDate: string | null;
}

export interface OosCaseResponse {
  id: number;
  oosNo: string;
  title: string | null;
  description: string | null;
  recordType: OosRecordType | null;
  severity: OosSeverity | null;
  department: string | null;
  lab: string | null;
  dateDetected: string | null;
  detectedById: number | null;
  ownerId: number | null;
  qaReviewerId: number | null;
  dueDate: string | null;
  productId: number | null;
  testCategory: OosTestCategory | null;
  testName: string | null;
  testMethod: string | null;
  specificationLimitMin: number | null;
  specificationLimitMax: number | null;
  specificationReference: string | null;
  trendLimit: string | null;
  reportedResult: string;
  unitOfMeasure: string | null;
  reportedDate: string | null;
  reportedById: number | null;
  reportedByName: string | null;
  sampleId: string | null;
  sampleType: OosSampleType | null;
  batchId: string | null;
  materialId: number | null;
  materialLotId: number | null;
  analystId: number | null;
  reviewerId: number | null;
  equipmentId: string | null;
  calibrationStatusAtTest: string | null;
  reagentUsed: string | null;
  reagentLot: string | null;
  referenceStdLot: string | null;
  immediateHoldRequired: boolean;
  holdApplied: boolean;
  holdAppliedTo: OosHoldTarget | null;
  holdReason: string | null;
  immediateActionTaken: string | null;
  productionImpact: boolean;
  releasedProductImpact: boolean;
  customerImpact: boolean;
  regulatoryImpact: boolean;
  investigationRequired: boolean;
  capaRequired: boolean;
  retestRequested: boolean;
  resampleRequested: boolean;
  qaDecision: OosQaDecision | null;
  closureComments: string | null;
  closedById: number | null;
  closedDate: string | null;
  reopenedById: number | null;
  reopenedAt: string | null;
  status: OosStatus;
  submittedBy: number | null;
  version: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  initialAssessment: OosInitialAssessment | null;
  repeatTesting: OosRepeatTesting | null;
  investigation: OosInvestigation | null;
  disposition: OosDispositionDetail | null;
  containment: OosContainmentDetail | null;
  investigationItems: OosInvestigationItem[];
  retestResample: OosRetestResampleItem[];
  impactAssessment: OosImpactAssessmentDetail | null;
  rootCause: OosRootCauseDetail | null;
  linkedRecords: OosLinkedRecordItem[];
  evidence: OosEvidenceItem[];
  linkedCapaIds: number[];
}
