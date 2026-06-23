"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { DeviationResponse, DeviationSeverity, DeviationStatus } from "@/types/deviation";

const FIVE_MIN = 5 * 60 * 1000;

export interface DeviationListParams {
  status?: DeviationStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const deviationKeys = {
  all: ["deviations"] as const,
  list: (p: DeviationListParams) => ["deviations", "list", p] as const,
  detail: (id: number) => ["deviations", "detail", id] as const,
  audit: (id: number) => ["deviations", id, "audit"] as const,
};

export function useDeviationList(params: DeviationListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: deviationKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<DeviationResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/deviations?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useDeviation(id: number) {
  return useQuery({
    queryKey: deviationKeys.detail(id),
    queryFn: async (): Promise<DeviationResponse> => (await api.get(`/api/deviations/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useDeviationAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: deviationKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/deviations/${id}/audit-trail`)).data,
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export interface CreateDeviationInput {
  title: string;
  severity: DeviationSeverity;
  description: string;
  immediateAction?: string | null;
  occurredDate?: string | null;
  // Extended fields added in M6 UI rebuild
  deviationType?: string;
  category?: string;
  relatedModule?: string;
  department?: string;
  initialRiskLevel?: string;
  whatHappened?: string;
  productAffected?: boolean;
  materialAffected?: boolean;
  batchAffected?: boolean;
  equipmentAffected?: boolean;
  supplierInvolved?: boolean;
  customerImpactPossible?: boolean;
  regulatoryImpactPossible?: boolean;
  dataIntegrityImpactPossible?: boolean;
  containmentRequired?: boolean;
  investigationRequired?: boolean;
  capaRequired?: boolean;
  changeControlRequired?: boolean;
  targetInvestigationDueDate?: string;
  targetClosureDueDate?: string;
}

export function useCreateDeviation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeviationInput): Promise<DeviationResponse> =>
      (await api.post("/api/deviations", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: deviationKeys.all }),
  });
}

export type DeviationAction =
  | "submit-for-investigation"
  | "submit-for-approval"
  | "reject"
  | "close"
  | "cancel";

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: deviationKeys.detail(id) });
  qc.invalidateQueries({ queryKey: deviationKeys.all });
  qc.invalidateQueries({ queryKey: deviationKeys.audit(id) });
}

export function useDeviationTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; action: DeviationAction; expectedVersion: number; reason?: string }): Promise<DeviationResponse> =>
      (await api.post(`/api/deviations/${vars.id}/${vars.action}`, { expectedVersion: vars.expectedVersion, reason: vars.reason })).data,
    onSuccess: (d) => invalidate(qc, d.id),
  });
}

export function useUpdateDeviationRootCause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; expectedVersion: number; rootCause: string; reason?: string }): Promise<DeviationResponse> =>
      (await api.put(`/api/deviations/${vars.id}/root-cause`, { expectedVersion: vars.expectedVersion, rootCause: vars.rootCause, reason: vars.reason })).data,
    onSuccess: (d) => invalidate(qc, d.id),
  });
}

export function useApproveDeviation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; expectedVersion: number; reason?: string; password: string; totpCode?: string; meaningStatement: string }): Promise<DeviationResponse> =>
      (await api.post(`/api/deviations/${id}/approve`, body)).data,
    onSuccess: (d) => invalidate(qc, d.id),
  });
}
