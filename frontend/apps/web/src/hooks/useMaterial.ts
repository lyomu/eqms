"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { MaterialResponse, MaterialStatus, MaterialType, UnitOfMeasure } from "@/types/material";

const FIVE_MIN = 5 * 60 * 1000;

export interface MaterialListParams {
  status?: MaterialStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const materialKeys = {
  all: ["materials"] as const,
  list: (p: MaterialListParams) => ["materials", "list", p] as const,
  detail: (id: number) => ["materials", "detail", id] as const,
  audit: (id: number) => ["materials", id, "audit"] as const,
};

export function useMaterialList(params: MaterialListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: materialKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<MaterialResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/materials?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: materialKeys.detail(id),
    queryFn: async (): Promise<MaterialResponse> => (await api.get(`/api/materials/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useMaterialAudit(id: number) {
  return useQuery({
    queryKey: materialKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/materials/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateMaterialInput {
  name: string;
  materialType: MaterialType;
  unitOfMeasure: UnitOfMeasure;
  specification?: string | null;
  description?: string | null;
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMaterialInput): Promise<MaterialResponse> =>
      (await api.post("/api/materials", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: materialKeys.all }),
  });
}

export interface UpdateMaterialInput {
  id: number;
  expectedVersion: number;
  description?: string | null;
  specification?: string | null;
  reason?: string;
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateMaterialInput): Promise<MaterialResponse> =>
      (await api.put(`/api/materials/${id}`, body)).data,
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: materialKeys.detail(m.id) });
      qc.invalidateQueries({ queryKey: materialKeys.all });
    },
  });
}

export type MaterialAction = "submit-for-approval" | "reject" | "put-on-hold" | "release" | "obsolete";

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: materialKeys.detail(id) });
  qc.invalidateQueries({ queryKey: materialKeys.all });
  qc.invalidateQueries({ queryKey: materialKeys.audit(id) });
}

export function useMaterialTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; action: MaterialAction; expectedVersion: number; reason?: string }): Promise<MaterialResponse> =>
      (await api.post(`/api/materials/${vars.id}/${vars.action}`, { expectedVersion: vars.expectedVersion, reason: vars.reason })).data,
    onSuccess: (m) => invalidate(qc, m.id),
  });
}

export function useApproveMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; expectedVersion: number; reason?: string; password: string; totpCode?: string; meaningStatement: string }): Promise<MaterialResponse> =>
      (await api.post(`/api/materials/${id}/approve`, body)).data,
    onSuccess: (m) => invalidate(qc, m.id),
  });
}
