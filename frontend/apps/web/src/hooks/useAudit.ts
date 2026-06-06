"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { AuditFollowUp, AuditResponse, AuditStatus, AuditTypeKey } from "@/types/audit";

const FIVE_MIN = 5 * 60 * 1000;

export interface AuditListParams {
  status?: AuditStatus | "";
  type?: AuditTypeKey | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const auditKeys = {
  all: ["audits"] as const,
  list: (p: AuditListParams) => ["audits", "list", p] as const,
  detail: (id: number) => ["audits", "detail", id] as const,
  followups: (id: number) => ["audits", id, "follow-up"] as const,
  trail: (id: number) => ["audits", id, "trail"] as const,
};

export function useAuditList(params: AuditListParams) {
  const { status, type, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: auditKeys.list({ status, type, page, size, sort }),
    queryFn: async (): Promise<PageResponse<AuditResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      if (type) s.set("type", type);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/audits?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAudit(id: number) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: async (): Promise<AuditResponse> => (await api.get(`/api/audits/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAuditFollowUps(id: number) {
  return useQuery({
    queryKey: auditKeys.followups(id),
    queryFn: async (): Promise<AuditFollowUp[]> => (await api.get(`/api/audits/${id}/follow-up`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAuditTrail(id: number) {
  return useQuery({
    queryKey: auditKeys.trail(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/audits/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateAuditInput {
  auditTitle: string;
  auditType: AuditTypeKey;
  scope: string;
  auditDate?: string | null;
  auditeeId?: number | null;
}

export function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAuditInput): Promise<AuditResponse> =>
      (await api.post("/api/audits", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: auditKeys.all }),
  });
}

export function useAuditAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/audits/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
      qc.invalidateQueries({ queryKey: auditKeys.all });
      qc.invalidateQueries({ queryKey: auditKeys.followups(id) });
      qc.invalidateQueries({ queryKey: auditKeys.trail(id) });
    },
  });
}
