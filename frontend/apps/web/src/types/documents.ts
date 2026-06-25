/** Mirrors the backend Document Control contract (com.eqms.documents). */

export type DocumentStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EFFECTIVE"
  | "SUPERSEDED"
  | "OBSOLETE"
  | "ARCHIVED";

export type DocumentTypeKey =
  | "SOP"
  | "WORK_INSTRUCTION"
  | "POLICY"
  | "FORM"
  | "SPECIFICATION"
  | "OTHER";

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
  SOP: "SOP",
  WORK_INSTRUCTION: "Work Instruction",
  POLICY: "Policy",
  FORM: "Form",
  SPECIFICATION: "Specification",
  OTHER: "Other",
};

/** GET /api/documents/{id} and list items. */
export interface DocumentResponse {
  id: number;
  documentNumber: string;
  title: string;
  type: DocumentTypeKey;
  status: DocumentStatus;
  majorVersion: number;
  minorVersion?: number;
  version: number;
  content: string | null;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  reviewPeriodMonths: number | null;
  supersededById: number | null;
  createdBy: number | null;
  submittedBy: number | null;
  folderId: number | null;
  ownerId?: number | null;
  approvalProfileId?: number | null;
  keywords?: string | null;
  referenceUrl?: string | null;
  pdfRenditionRequired?: boolean;
  referenceDocumentIds?: number[];
  checkedOutBy: number | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/document-folders */
export interface DocumentFolder {
  id: number;
  name: string;
  parentId: number | null;
  children: DocumentFolder[];
}

export interface DocumentApprovalProfile {
  id: number;
  name: string;
  description: string | null;
}

/** GET /api/documents/{id}/notes and /change-requests */
export interface DocumentNote {
  id: number;
  documentId: number;
  noteType: "NOTE" | "CHANGE_REQUEST";
  content: string;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
}

/** Backend pagination envelope (PageResponse<T>). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** GET /api/documents/{id}/audit-trail */
export interface AuditEntry {
  id: number;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  reasonForChange: string | null;
  userId: number | null;
  userFullName: string | null;
  utcTimestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/** GET /api/documents/{id}/versions */
export interface DocumentVersion {
  id: number;
  majorVersion: number;
  versionLabel: string;
  status: DocumentStatus;
  title: string;
  content: string | null;
  changeNotes: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
}

/** GET /api/documents/{id}/approvals */
export interface SignatureEntry {
  id: number;
  userId: number;
  signerFullName: string;
  meaning: string;
  meaningStatement: string;
  signedAt: string;
}

/** GET /api/attachments/{recordType}/{recordId} */
export interface AttachmentResponse {
  id: number;
  recordType: string;
  recordId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  attachmentRole?: "SOURCE" | "SUPPORTING";
  uploadedBy: number | null;
  uploadedAt: string;
}

/** GET /api/users */
export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  status: string;
}

/** Controlled signature-meaning vocabulary (CLAUDE.md rule 4). */
export const SIGNATURE_MEANINGS = [
  "Authored",
  "Reviewed",
  "Approved",
  "Released",
] as const;
export type SignatureMeaningLabel = (typeof SIGNATURE_MEANINGS)[number];
