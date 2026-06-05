"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { DosageForm, ProductResponse, ProductStatus } from "@/types/product";

const FIVE_MIN = 5 * 60 * 1000;

export interface ProductListParams {
  status?: ProductStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const productKeys = {
  all: ["products"] as const,
  list: (p: ProductListParams) => ["products", "list", p] as const,
  detail: (id: number) => ["products", "detail", id] as const,
  audit: (id: number) => ["products", id, "audit"] as const,
};

export function useProductList(params: ProductListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: productKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<ProductResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/products?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async (): Promise<ProductResponse> => (await api.get(`/api/products/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useProductAudit(id: number) {
  return useQuery({
    queryKey: productKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/products/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateProductInput {
  name: string;
  dosageForm: DosageForm;
  strength?: string | null;
  description?: string | null;
  registrationNumber?: string | null;
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput): Promise<ProductResponse> =>
      (await api.post("/api/products", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export interface UpdateProductInput {
  id: number;
  expectedVersion: number;
  description?: string | null;
  strength?: string | null;
  registrationNumber?: string | null;
  reason?: string;
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateProductInput): Promise<ProductResponse> =>
      (await api.put(`/api/products/${id}`, body)).data,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(p.id) });
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export type ProductAction = "submit-for-approval" | "reject" | "put-on-hold" | "resume" | "discontinue";

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: productKeys.detail(id) });
  qc.invalidateQueries({ queryKey: productKeys.all });
  qc.invalidateQueries({ queryKey: productKeys.audit(id) });
}

export function useProductTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; action: ProductAction; expectedVersion: number; reason?: string }): Promise<ProductResponse> =>
      (await api.post(`/api/products/${vars.id}/${vars.action}`, { expectedVersion: vars.expectedVersion, reason: vars.reason })).data,
    onSuccess: (p) => invalidate(qc, p.id),
  });
}

export function useApproveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; expectedVersion: number; reason?: string; password: string; totpCode?: string; meaningStatement: string }): Promise<ProductResponse> =>
      (await api.post(`/api/products/${id}/approve`, body)).data,
    onSuccess: (p) => invalidate(qc, p.id),
  });
}
