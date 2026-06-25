/** Mirrors the backend Change Control contract (com.eqms.changecontrol). Base path: /api/change-controls. */

export type ChangeStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_IMPLEMENTATION"
  | "IMPLEMENTED"
  | "PENDING_CLOSURE"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export type ChangeTypeKey = "MAJOR" | "MINOR";

export interface ChangeImpactTask {
  checkpointNo: number | null;
  impactArea: string | null;
  applicability: string | null;
  proposedTask: string | null;
  taskAssignee: string | null;
  remarks: string | null;
}

export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  CHANGES_REQUESTED: "Changes Requested",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  IN_IMPLEMENTATION: "In Implementation",
  IMPLEMENTED: "Implemented",
  PENDING_CLOSURE: "Pending Closure",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export interface ChangeControlResponse {
  id: number;
  changeNumber: string;
  title: string;
  type: ChangeTypeKey;
  status: ChangeStatus;
  version: number;
  description: string;
  locationName: string | null;
  purposeOfChange: string | null;
  regulatoryMandateEffectiveDate: string | null;
  regulatoryMandateSource: string | null;
  changeCategory: string | null;
  relatedMarket: string | null;
  relatedCustomer: string | null;
  vendorCode: string | null;
  vendorName: string | null;
  productItemCode: string | null;
  productItemDescription: string | null;
  equipmentIdNumber: string | null;
  equipmentName: string | null;
  documentName: string | null;
  documentNumber: string | null;
  currentStatusBrief: string | null;
  proposedChangeBrief: string | null;
  justification: string | null;
  changeNature: string | null;
  temporaryChangePeriod: string | null;
  effectivenessCheckRequired: boolean;
  targetImplementationDate: string | null;
  changeOwner: string | null;
  changeOwnerHod: string | null;
  qaResponsible: string | null;
  involvedDepartments: string[];
  impactTasks: ChangeImpactTask[];
  radAssessmentRequired: string | null;
  customerCgAssessmentRequired: string | null;
  customerCgComments: string | null;
  qaAssessmentBy: string | null;
  qaAssessmentOn: string | null;
  internalCustomer: string | null;
  changeAcceptance: string | null;
  qaComment: string | null;
  recommendations: string | null;
  qpComments: string | null;
  variationClassification: string | null;
  documentsRequestedForFiling: string | null;
  recommendationForRelease: string | null;
  otherRecommendations: string | null;
  radAssessment: string | null;
  otherDepartmentsReview: string | null;
  finalQaDecision: string | null;
  qaReviewDate: string | null;
  qaReviewer: string | null;
  implementedDate: string | null;
  implementationDetails: string | null;
  implementationReview: string | null;
  actionConfirmationComment: string | null;
  changeEffectiveDate: string | null;
  closureRemarks: string | null;
  batchArNumber: string | null;
  productMaterialCode: string | null;
  productMaterialName: string | null;
  closedByName: string | null;
  closedDate: string | null;
  createdBy: number | null;
  submittedBy: number | null;
  createdAt: string;
  updatedAt: string;
}
