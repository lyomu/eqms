"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { NcStatus, NcType, NonConformanceResponse } from "@/types/nonconformance";

export const ncKeys = { all: ["non-conformances"] as const, list: (p: unknown) => ["non-conformances", "list", p] as const, detail: (id: number) => ["non-conformances", id] as const, trail: (id: number) => ["non-conformances", id, "trail"] as const };
export function useNonConformanceList(params: { status?: NcStatus | ""; type?: NcType | ""; page?: number; size?: number; sort?: string }) {
  const { status, type, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({ queryKey: ncKeys.list({ status, type, page, size, sort }), queryFn: async (): Promise<PageResponse<NonConformanceResponse>> => { const s = new URLSearchParams({ page: String(page), size: String(size), sort }); if (status) s.set("status", status); if (type) s.set("type", type); return (await api.get(`/api/non-conformances?${s}`)).data; }, placeholderData: (p) => p });
}
export function useNonConformance(id: number) { return useQuery({ queryKey: ncKeys.detail(id), queryFn: async (): Promise<NonConformanceResponse> => (await api.get(`/api/non-conformances/${id}`)).data, enabled: id > 0 }); }
export function useNonConformanceTrail(id: number) { return useQuery({ queryKey: ncKeys.trail(id), queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/non-conformances/${id}/audit-trail`)).data, enabled: id > 0 }); }
export function useCreateNonConformance() { const qc = useQueryClient(); return useMutation({ mutationFn: async (input: Record<string, unknown>): Promise<NonConformanceResponse> => (await api.post("/api/non-conformances", input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ncKeys.all }) }); }
export function useNonConformanceAction(id: number) { const qc = useQueryClient(); return useMutation({ mutationFn: async (vars: { path: string; body: Record<string, unknown> }) => (await api.post(`/api/non-conformances/${id}/${vars.path}`, vars.body)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: ncKeys.all }); qc.invalidateQueries({ queryKey: ncKeys.detail(id) }); qc.invalidateQueries({ queryKey: ncKeys.trail(id) }); } }); }
