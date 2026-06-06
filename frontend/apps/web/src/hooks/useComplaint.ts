"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { ComplaintResponse, ComplaintSeverity, ComplaintSource, ComplaintStatus } from "@/types/complaint";

const FIVE_MIN = 5 * 60 * 1000;

export interface ComplaintListParams {
  status?: ComplaintStatus | "";
  source?: ComplaintSource | "";
  severity?: ComplaintSeverity | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const complaintKeys = {
  all: ["complaints"] as const,
  list: (p: ComplaintListParams) => ["complaints", "list", p] as const,
  detail: (id: number) => ["complaints", "detail", id] as const,
  audit: (id: number) => ["complaints", id, "audit"] as const,
};

export function useComplaintList(params: ComplaintListParams) {
  const { status, source, severity, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: complaintKeys.list({ status, source, severity, page, size, sort }),
    queryFn: async (): Promise<PageResponse<ComplaintResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      if (source) s.set("source", source);
      if (severity) s.set("severity", severity);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/complaints?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useComplaint(id: number) {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: async (): Promise<ComplaintResponse> => (await api.get(`/api/complaints/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useComplaintAudit(id: number) {
  return useQuery({
    queryKey: complaintKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/complaints/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateComplaintInput {
  productId: number;
  complaintDescription: string;
  source: ComplaintSource;
  severity: ComplaintSeverity;
  reportedBy?: string | null;
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateComplaintInput): Promise<ComplaintResponse> =>
      (await api.post("/api/complaints", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: complaintKeys.all }),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: complaintKeys.detail(id) });
  qc.invalidateQueries({ queryKey: complaintKeys.all });
  qc.invalidateQueries({ queryKey: complaintKeys.audit(id) });
}

/** Generic poster for a complaint sub-action; returns the refreshed complaint (or void). */
export function useComplaintAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/complaints/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}
