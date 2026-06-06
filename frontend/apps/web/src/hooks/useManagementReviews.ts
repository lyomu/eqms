"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { ManagementReviewResponse, MrStatus, ReviewActionItem } from "@/types/management-review";

export const mrKeys = { all: ["management-reviews"] as const, list: (p: unknown) => ["management-reviews", "list", p] as const, detail: (id: number) => ["management-reviews", id] as const, previous: (id: number) => ["management-reviews", id, "previous"] as const, trail: (id: number) => ["management-reviews", id, "trail"] as const };
export function useManagementReviewList(params: { status?: MrStatus | ""; page?: number; size?: number; sort?: string }) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({ queryKey: mrKeys.list({ status, page, size, sort }), queryFn: async (): Promise<PageResponse<ManagementReviewResponse>> => { const s = new URLSearchParams({ page: String(page), size: String(size), sort }); if (status) s.set("status", status); return (await api.get(`/api/management-reviews?${s}`)).data; }, placeholderData: (p) => p });
}
export function useManagementReview(id: number) { return useQuery({ queryKey: mrKeys.detail(id), queryFn: async (): Promise<ManagementReviewResponse> => (await api.get(`/api/management-reviews/${id}`)).data, enabled: id > 0 }); }
export function usePreviousReviewActions(id: number) { return useQuery({ queryKey: mrKeys.previous(id), queryFn: async (): Promise<ReviewActionItem[]> => (await api.get(`/api/management-reviews/${id}/previous-actions`)).data, enabled: id > 0 }); }
export function useManagementReviewTrail(id: number) { return useQuery({ queryKey: mrKeys.trail(id), queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/management-reviews/${id}/audit-trail`)).data, enabled: id > 0 }); }
export function useCreateManagementReview() { const qc = useQueryClient(); return useMutation({ mutationFn: async (input: Record<string, unknown>): Promise<ManagementReviewResponse> => (await api.post("/api/management-reviews", input)).data, onSuccess: () => qc.invalidateQueries({ queryKey: mrKeys.all }) }); }
export function useManagementReviewAction(id: number) { const qc = useQueryClient(); return useMutation({ mutationFn: async (vars: { path: string; body: Record<string, unknown> }) => (await api.post(`/api/management-reviews/${id}/${vars.path}`, vars.body)).data, onSuccess: () => { qc.invalidateQueries({ queryKey: mrKeys.all }); qc.invalidateQueries({ queryKey: mrKeys.detail(id) }); qc.invalidateQueries({ queryKey: mrKeys.previous(id) }); qc.invalidateQueries({ queryKey: mrKeys.trail(id) }); } }); }
