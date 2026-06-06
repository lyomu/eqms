import { api } from "@/lib/api";

export type SettingsSection = "general" | "onboarding" | "security" | "notifications" | "data-retention";

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
}

export interface AdminSettingsSummary {
  general: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  security: Record<string, unknown>;
  license: LicenseStatus;
}

export async function getAdminSettingsSummary() {
  const { data } = await api.get<AdminSettingsSummary>("/api/admin/settings/summary");
  return data;
}

export async function getSettingsSection(section: SettingsSection) {
  const { data } = await api.get<Record<string, unknown>>(`/api/admin/settings/${section}`);
  return data;
}

export async function updateSettingsSection(section: SettingsSection, values: Record<string, unknown>) {
  const { data } = await api.put<Record<string, unknown>>(`/api/admin/settings/${section}`, values);
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
