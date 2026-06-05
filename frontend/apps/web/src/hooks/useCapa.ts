"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  CapaActionResponse,
  CapaActionTypeKey,
  CapaResponse,
  CapaSource,
  CapaStatus,
} from "@/types/capa";

const FIVE_MIN = 5 * 60 * 1000;

export interface CapaListParams {
  status?: CapaStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const capaKeys = {
  all: ["capas"] as const,
  list: (p: CapaListParams) => ["capas", "list", p] as const,
  detail: (id: number) => ["capas", "detail", id] as const,
  audit: (id: number) => ["capas", id, "audit"] as const,
  actions: (id: number) => ["capas", id, "actions"] as const,
};

export function useCapaList(params: CapaListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: capaKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<CapaResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/capas?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCapa(id: number) {
  return useQuery({
    queryKey: capaKeys.detail(id),
    queryFn: async (): Promise<CapaResponse> => (await api.get(`/api/capas/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCapaActions(id: number) {
  return useQuery({
    queryKey: capaKeys.actions(id),
    queryFn: async (): Promise<CapaActionResponse[]> => (await api.get(`/api/capas/${id}/actions`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCapaAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: capaKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/capas/${id}/audit-trail`)).data,
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export interface CreateCapaInput {
  title: string;
  source: CapaSource;
  description: string;
  effectivenessCheckRequired: boolean;
  dueDate?: string | null;
}

export function useCreateCapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCapaInput): Promise<CapaResponse> =>
      (await api.post("/api/capas", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: capaKeys.all }),
  });
}

export type CapaAction =
  | "submit-for-investigation"
  | "submit-for-approval"
  | "reject"
  | "start-actions"
  | "submit-for-effectiveness"
  | "cancel";

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: capaKeys.detail(id) });
  qc.invalidateQueries({ queryKey: capaKeys.all });
  qc.invalidateQueries({ queryKey: capaKeys.audit(id) });
}

export function useCapaTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; action: CapaAction; expectedVersion: number; reason?: string }): Promise<CapaResponse> =>
      (await api.post(`/api/capas/${vars.id}/${vars.action}`, { expectedVersion: vars.expectedVersion, reason: vars.reason })).data,
    onSuccess: (c) => invalidate(qc, c.id),
  });
}

export function useUpdateCapaRootCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; expectedVersion: number; rootCause: string; reason?: string }): Promise<CapaResponse> =>
      (await api.put(`/api/capas/${vars.id}/root-cause`, { expectedVersion: vars.expectedVersion, rootCause: vars.rootCause, reason: vars.reason })).data,
    onSuccess: (c) => invalidate(qc, c.id),
  });
}

export function useApproveCapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; expectedVersion: number; reason?: string; password: string; totpCode?: string; meaningStatement: string }): Promise<CapaResponse> =>
      (await api.post(`/api/capas/${id}/approve`, body)).data,
    onSuccess: (c) => invalidate(qc, c.id),
  });
}

export function useCloseCapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; expectedVersion: number; reason?: string; password: string; totpCode?: string; meaningStatement: string; effectivenessResult?: string }): Promise<CapaResponse> =>
      (await api.post(`/api/capas/${id}/close`, body)).data,
    onSuccess: (c) => invalidate(qc, c.id),
  });
}

export interface AddCapaActionInput {
  id: number;
  actionType: CapaActionTypeKey;
  description: string;
  assignedTo?: number | null;
  dueDate?: string | null;
}

export function useAddCapaAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: AddCapaActionInput): Promise<CapaActionResponse> =>
      (await api.post(`/api/capas/${id}/actions`, body)).data,
    onSuccess: (_a, vars) => {
      qc.invalidateQueries({ queryKey: capaKeys.actions(vars.id) });
      qc.invalidateQueries({ queryKey: capaKeys.audit(vars.id) });
    },
  });
}

export function useCompleteCapaAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { actionId: number; capaId: number }): Promise<CapaActionResponse> =>
      (await api.post(`/api/capas/actions/${vars.actionId}/complete`)).data,
    onSuccess: (_a, vars) => {
      qc.invalidateQueries({ queryKey: capaKeys.actions(vars.capaId) });
      qc.invalidateQueries({ queryKey: capaKeys.audit(vars.capaId) });
    },
  });
}
