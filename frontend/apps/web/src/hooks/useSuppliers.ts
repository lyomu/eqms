"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  FindingSeverity,
  SupplierCertification,
  SupplierFinding,
  SupplierPerformance,
  SupplierQualification,
  SupplierResponse,
  SupplierStatus,
  SupplierType,
} from "@/types/supplier";

const FIVE_MIN = 5 * 60 * 1000;

export interface SupplierListParams {
  status?: SupplierStatus | "";
  type?: SupplierType | "";
  certStatus?: "CERTIFIED" | "EXPIRED" | "PENDING" | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: (p: SupplierListParams) => ["suppliers", "list", p] as const,
  detail: (id: number) => ["suppliers", "detail", id] as const,
  certs: (id: number) => ["suppliers", id, "certifications"] as const,
  performance: (id: number) => ["suppliers", id, "performance"] as const,
  audits: (id: number) => ["suppliers", id, "audits"] as const,
  findings: (id: number) => ["suppliers", id, "findings"] as const,
  trail: (id: number) => ["suppliers", id, "trail"] as const,
};

export function useSupplierList(params: SupplierListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: supplierKeys.list({ ...params, page, size, sort }),
    queryFn: async (): Promise<PageResponse<SupplierResponse>> => {
      const s = new URLSearchParams({ page: String(page), size: String(size), sort });
      if (status) s.set("status", status);
      return (await api.get(`/api/suppliers?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: async (): Promise<SupplierResponse> => (await api.get(`/api/suppliers/${id}`)).data,
    enabled: Number.isFinite(id) && id > 0,
    staleTime: FIVE_MIN,
  });
}

export function useSupplierCertifications(id: number) {
  return useQuery({ queryKey: supplierKeys.certs(id), queryFn: async (): Promise<SupplierCertification[]> => (await api.get(`/api/suppliers/${id}/certifications`)).data, enabled: id > 0 });
}
export function useSupplierPerformance(id: number) {
  return useQuery({ queryKey: supplierKeys.performance(id), queryFn: async (): Promise<SupplierPerformance[]> => (await api.get(`/api/suppliers/${id}/performance-history`)).data, enabled: id > 0 });
}
export function useSupplierAudits(id: number) {
  return useQuery({ queryKey: supplierKeys.audits(id), queryFn: async (): Promise<SupplierQualification[]> => (await api.get(`/api/suppliers/${id}/audit-history`)).data, enabled: id > 0 });
}
export function useSupplierFindings(id: number) {
  return useQuery({ queryKey: supplierKeys.findings(id), queryFn: async (): Promise<SupplierFinding[]> => (await api.get(`/api/suppliers/${id}/findings`)).data, enabled: id > 0 });
}
export function useSupplierTrail(id: number) {
  return useQuery({ queryKey: supplierKeys.trail(id), queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/suppliers/${id}/audit-trail`)).data, enabled: id > 0 });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { supplierName: string; supplierType: SupplierType; contactPerson?: string; email?: string; phone?: string; location: string }): Promise<SupplierResponse> =>
      (await api.post("/api/suppliers", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useSupplierAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/suppliers/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supplierKeys.all });
      qc.invalidateQueries({ queryKey: supplierKeys.detail(id) });
      qc.invalidateQueries({ queryKey: supplierKeys.certs(id) });
      qc.invalidateQueries({ queryKey: supplierKeys.performance(id) });
      qc.invalidateQueries({ queryKey: supplierKeys.audits(id) });
      qc.invalidateQueries({ queryKey: supplierKeys.findings(id) });
      qc.invalidateQueries({ queryKey: supplierKeys.trail(id) });
    },
  });
}

export type CreateFindingInput = { findingDescription: string; severity: FindingSeverity; rootCause?: string; correctiveActionRequired: boolean };
