"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approveSettingsChangeRequest,
  createSettingsChangeRequest,
  getAdminSettingsAuditLog,
  getAdminSettingsSummary,
  getLicenseStatus,
  getNotificationTemplates,
  getNumberingSchemes,
  getSettingsChangeRequests,
  getSettingsReferences,
  getSettingsSection,
  previewNumberingScheme,
  rejectSettingsChangeRequest,
  updateNotificationTemplate,
  updateNumberingScheme,
  updateSettingsSection,
  type NotificationTemplate,
  type NumberingScheme,
  type SettingsSection,
  type SettingsUpdateMetadata,
} from "@/lib/admin/settings";

export const ADMIN_SETTINGS_KEYS = {
  summary: ["admin-settings", "summary"] as const,
  section: (section: SettingsSection) => ["admin-settings", "section", section] as const,
  license: ["admin-settings", "license"] as const,
  numbering: ["admin-settings", "numbering"] as const,
  notifications: ["admin-settings", "notifications"] as const,
  audit: ["admin-settings", "audit"] as const,
  references: ["admin-settings", "references"] as const,
  changeRequests: ["admin-settings", "change-requests"] as const,
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

export function useSettingsReferences() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.references,
    queryFn: getSettingsReferences,
  });
}

export function useUpdateSettingsSection(section: SettingsSection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input:
        | Record<string, unknown>
        | { values: Record<string, unknown>; metadata?: SettingsUpdateMetadata }
    ) => {
      if ("values" in input && typeof input.values === "object" && input.values !== null) {
        const values = input.values as Record<string, unknown>;
        const metadata =
          "metadata" in input && typeof input.metadata === "object" && input.metadata !== null
            ? (input.metadata as SettingsUpdateMetadata)
            : undefined;
        return updateSettingsSection(section, values, metadata);
      }
      return updateSettingsSection(section, input);
    },
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

export function useCreateSettingsChangeRequest(section: SettingsSection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, metadata }: { values: Record<string, unknown>; metadata: SettingsUpdateMetadata }) =>
      createSettingsChangeRequest(section, values, metadata),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.changeRequests }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.audit }),
      ]);
      toast.success("Settings change request submitted.");
    },
  });
}

export function useSettingsChangeRequests() {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEYS.changeRequests,
    queryFn: getSettingsChangeRequests,
  });
}

export function useApproveSettingsChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => approveSettingsChangeRequest(id, comment),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.changeRequests }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.audit }),
        queryClient.invalidateQueries({ queryKey: ["admin-settings"] }),
      ]);
      toast.success("Settings change request approved.");
    },
  });
}

export function useRejectSettingsChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => rejectSettingsChangeRequest(id, comment),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.changeRequests }),
        queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_KEYS.audit }),
      ]);
      toast.success("Settings change request rejected.");
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

export function usePreviewNumberingScheme() {
  return useMutation({
    mutationFn: ({ moduleCode, values }: { moduleCode: string; values: Partial<NumberingScheme> }) =>
      previewNumberingScheme(moduleCode, values),
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
