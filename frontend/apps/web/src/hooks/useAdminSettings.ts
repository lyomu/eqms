"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminSettingsAuditLog,
  getAdminSettingsSummary,
  getLicenseStatus,
  getNotificationTemplates,
  getNumberingSchemes,
  getSettingsSection,
  updateNotificationTemplate,
  updateNumberingScheme,
  updateSettingsSection,
  type NotificationTemplate,
  type NumberingScheme,
  type SettingsSection,
} from "@/lib/admin/settings";

export const ADMIN_SETTINGS_KEYS = {
  summary: ["admin-settings", "summary"] as const,
  section: (section: SettingsSection) => ["admin-settings", "section", section] as const,
  license: ["admin-settings", "license"] as const,
  numbering: ["admin-settings", "numbering"] as const,
  notifications: ["admin-settings", "notifications"] as const,
  audit: ["admin-settings", "audit"] as const,
};

export function useAdminSettingsSummary() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.summary,
    queryFn: getAdminSettingsSummary,
  });
}

export function useSettingsSection(section: SettingsSection) {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.section(section),
    queryFn: () => getSettingsSection(section),
  });
}

export function useUpdateSettingsSection(section: SettingsSection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => updateSettingsSection(section, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.section(section) }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.summary }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.audit }),
      ]);
      toast.success("Organization settings saved.");
    },
  });
}

export function useLicenseStatus() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.license,
    queryFn: getLicenseStatus,
  });
}

export function useNumberingSchemes() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.numbering,
    queryFn: getNumberingSchemes,
  });
}

export function useUpdateNumberingScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleCode, values }: { moduleCode: string; values: Partial<NumberingScheme> }) =>
      updateNumberingScheme(moduleCode, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.numbering }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.audit }),
      ]);
      toast.success("Numbering scheme saved.");
    },
  });
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.notifications,
    queryFn: getNotificationTemplates,
  });
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventType, values }: { eventType: string; values: Partial<NotificationTemplate> }) =>
      updateNotificationTemplate(eventType, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.notifications }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.audit }),
      ]);
      toast.success("Notification template saved.");
    },
  });
}

export function useAdminSettingsAuditLog() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.audit,
    queryFn: getAdminSettingsAuditLog,
  });
}
