"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { RiskCategory, RiskResponse, RiskStatus } from "@/types/risk";

const FIVE_MIN = 5 * 60 * 1000;

export interface RiskListParams {
  status?: RiskStatus | "";
  category?: RiskCategory | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const riskKeys = {
  all: ["risks"] as const,
  list: (p: RiskListParams) => ["risks", "list", p] as const,
  detail: (id: number) => ["risks", "detail", id] as const,
  trail: (id: number) => ["risks", id, "trail"] as const,
};

export function useRiskList(params: RiskListParams) {
  const { status, category, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: riskKeys.list({ status, category, page, size, sort }),
    queryFn: async (): Promise<PageResponse<RiskResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      if (category) s.set("category", category);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/risks?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useRisk(id: number) {
  return useQuery({
    queryKey: riskKeys.detail(id),
    queryFn: async (): Promise<RiskResponse> => (await api.get(`/api/risks/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useRiskTrail(id: number) {
  return useQuery({
    queryKey: riskKeys.trail(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/risks/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateRiskInput {
  title: string;
  category: RiskCategory;
  description: string;
  potentialImpact: string;
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRiskInput): Promise<RiskResponse> => (await api.post("/api/risks", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: riskKeys.all }),
  });
}

export function useRiskAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/risks/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: riskKeys.detail(id) });
      qc.invalidateQueries({ queryKey: riskKeys.all });
      qc.invalidateQueries({ queryKey: riskKeys.trail(id) });
    },
  });
}
