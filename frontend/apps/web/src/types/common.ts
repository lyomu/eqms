/** Shared API envelope + audit shapes used across modules (com.eqms.common.dto). */

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Read-only audit-trail entry (com.eqms.common.dto.AuditEntryResponse). */
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
