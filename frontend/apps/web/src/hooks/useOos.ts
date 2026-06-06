"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { OosCaseResponse, OosStatus } from "@/types/oos";

const FIVE_MIN = 5 * 60 * 1000;

export interface OosListParams {
  status?: OosStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const oosKeys = {
  all: ["oos"] as const,
  list: (p: OosListParams) => ["oos", "list", p] as const,
  detail: (id: number) => ["oos", "detail", id] as const,
  trail: (id: number) => ["oos", id, "trail"] as const,
};

export function useOosList(params: OosListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: oosKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<OosCaseResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/oos?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useOos(id: number) {
  return useQuery({
    queryKey: oosKeys.detail(id),
    queryFn: async (): Promise<OosCaseResponse> => (await api.get(`/api/oos/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useOosTrail(id: number) {
  return useQuery({
    queryKey: oosKeys.trail(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/oos/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateOosInput {
  productId?: number | null;
  testMethod?: string | null;
  specificationLimitMin?: number | null;
  specificationLimitMax?: number | null;
  reportedResult: string;
  reportedByName?: string | null;
}

export function useCreateOos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOosInput): Promise<OosCaseResponse> => (await api.post("/api/oos", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.all }),
  });
}

export function useOosAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/oos/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: oosKeys.detail(id) });
      qc.invalidateQueries({ queryKey: oosKeys.all });
      qc.invalidateQueries({ queryKey: oosKeys.trail(id) });
    },
  });
}
