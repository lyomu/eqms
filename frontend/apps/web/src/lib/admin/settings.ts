import { api } from "@/lib/api";

export type SettingsSection =
  | "general"
  | "onboarding"
  | "security"
  | "notifications"
  | "data-retention"
  | "qms-scope"
  | "sites"
  | "departments-processes"
  | "approval-matrix"
  | "workflow"
  | "risk"
  | "document-control"
  | "training"
  | "audit"
  | "supplier"
  | "equipment"
  | "material"
  | "quality-events"
  | "oos-complaint"
  | "change-control"
  | "esignature"
  | "audit-trail"
  | "localization"
  | "integrations"
  | "management-review";

export interface SettingsUpdateMetadata {
  changeReason?: string;
  effectiveDate?: string;
  changeImpact?: string;
  approvalStatus?: string;
}

export interface LicenseStatus {
  organizationId: number;
  organizationName: string;
  status: string;
  planName?: string | null;
  licenseStatus?: string | null;
  userLimit?: number | null;
  siteLimit?: number | null;
  expiresAt?: string | null;
  userCount?: number | null;
}

export interface NumberingScheme {
  moduleCode: string;
  prefix: string;
  formatPattern: string;
  nextSequence: number;
  yearlyReset: boolean;
  yearFormat?: string;
  sequenceLength?: number;
  separator?: string;
  resetFrequency?: string;
  active?: boolean;
  example?: string;
}

export interface NotificationTemplate {
  eventType: string;
  subject: string;
  body: string;
  enabled: boolean;
}

export interface AdminSettingsAuditLog {
  section: string;
  action: string;
  reason: string;
  userId: number;
  userFullName: string;
  timestamp: string;
  oldValue?: unknown;
  newValue?: unknown;
  effectiveDate?: string | null;
  changeImpact?: string | null;
  approvalStatus?: string | null;
}

export interface AdminSettingsSummary {
  general: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  security: Record<string, unknown>;
  qmsScope?: Record<string, unknown>;
  configurationHealth?: Array<Record<string, unknown>>;
  license: LicenseStatus;
}

export interface SettingsReference {
  id: number;
  name?: string;
  fullName?: string;
  email?: string;
  code?: string;
  status?: string;
  description?: string | null;
}

export interface SettingsReferences {
  users: SettingsReference[];
  roles: SettingsReference[];
  departments: SettingsReference[];
}

export interface SettingsChangeRequest {
  id: number;
  section: string;
  status: string;
  changeReason: string;
  changeImpact?: string | null;
  effectiveDate: string;
  requestedBy: number;
  requestedByName: string;
  requestedAt: string;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  oldValue?: string;
  proposedValue?: string;
}

export async function getAdminSettingsSummary() {
  const { data } = await api.get<AdminSettingsSummary>("/api/admin/settings/summary");
  return data;
}

export async function getSettingsSection(section: SettingsSection) {
  const { data } = await api.get<Record<string, unknown>>(`/api/admin/settings/${section}`);
  return data;
}

export async function getSettingsReferences() {
  const { data } = await api.get<SettingsReferences>("/api/admin/settings/references");
  return data;
}

export async function updateSettingsSection(
  section: SettingsSection,
  values: Record<string, unknown>,
  metadata?: SettingsUpdateMetadata
) {
  const payload = metadata
    ? {
        settings: values,
        changeReason: metadata.changeReason,
        effectiveDate: metadata.effectiveDate,
        changeImpact: metadata.changeImpact,
        approvalStatus: metadata.approvalStatus,
      }
    : values;
  const { data } = await api.put<Record<string, unknown>>(`/api/admin/settings/${section}`, payload);
  return data;
}

export async function getLicenseStatus() {
  const { data } = await api.get<LicenseStatus>("/api/admin/settings/license");
  return data;
}

export async function getNumberingSchemes() {
  const { data } = await api.get<NumberingScheme[]>("/api/admin/settings/numbering");
  return data;
}

export async function updateNumberingScheme(moduleCode: string, values: Partial<NumberingScheme>) {
  const { data } = await api.put<NumberingScheme>(`/api/admin/settings/numbering/${moduleCode}`, values);
  return data;
}

export async function previewNumberingScheme(moduleCode: string, values: Partial<NumberingScheme>) {
  const { data } = await api.post<{ moduleCode: string; example: string }>(
    `/api/admin/settings/numbering/${moduleCode}/preview`,
    values
  );
  return data;
}

export async function getSettingsChangeRequests() {
  const { data } = await api.get<SettingsChangeRequest[]>("/api/admin/settings/change-requests");
  return data;
}

export async function createSettingsChangeRequest(
  section: SettingsSection,
  values: Record<string, unknown>,
  metadata: SettingsUpdateMetadata
) {
  const { data } = await api.post<SettingsChangeRequest>(`/api/admin/settings/change-requests/${section}`, {
    settings: values,
    ...metadata,
  });
  return data;
}

export async function approveSettingsChangeRequest(id: number, comment: string) {
  const { data } = await api.post<SettingsChangeRequest>(`/api/admin/settings/change-requests/${id}/approve`, {
    comment,
  });
  return data;
}

export async function rejectSettingsChangeRequest(id: number, comment: string) {
  const { data } = await api.post<SettingsChangeRequest>(`/api/admin/settings/change-requests/${id}/reject`, {
    comment,
  });
  return data;
}

export async function getNotificationTemplates() {
  const { data } = await api.get<NotificationTemplate[]>("/api/admin/settings/notification-templates");
  return data;
}

export async function updateNotificationTemplate(eventType: string, values: Partial<NotificationTemplate>) {
  const { data } = await api.put<NotificationTemplate>(
    `/api/admin/settings/notification-templates/${eventType}`,
    values
  );
  return data;
}

export async function getAdminSettingsAuditLog() {
  const { data } = await api.get<AdminSettingsAuditLog[]>("/api/admin/settings/audit-log");
  return data;
}
