"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  DosageForm,
  ProductApprovalHistory,
  ProductCriticality,
  ProductEvidence,
  IsoReadiness,
  ProductResponse,
  ProductStatus,
  ProductSummary,
  ProductTraceability,
} from "@/types/product";

const FIVE_MIN = 5 * 60 * 1000;

export interface ProductListParams {
  status?: ProductStatus | "";
  search?: string;
  productType?: string;
  category?: string;
  criticality?: ProductCriticality | "";
  ownerId?: number | "";
  specificationStatus?: string;
  dueForReview?: boolean;
  openQualityIssues?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export const productKeys = {
  all: ["products"] as const,
  summary: () => ["products", "summary"] as const,
  list: (p: ProductListParams) => ["products", "list", p] as const,
  detail: (id: number) => ["products", "detail", id] as const,
  section: (id: number, section: string) => ["products", id, section] as const,
  traceability: (id: number) => ["products", id, "traceability"] as const,
  readiness: (id: number) => ["products", id, "iso-readiness"] as const,
  history: (id: number) => ["products", id, "approval-history"] as const,
  audit: (id: number) => ["products", id, "audit"] as const,
};

export function useProductSummary() {
  return useQuery({
    queryKey: productKeys.summary(),
    queryFn: async (): Promise<ProductSummary> => (await api.get("/api/products/summary")).data,
  });
}

export function useProductList(params: ProductListParams) {
  const { page = 0, size = 10, sort = "createdAt,desc", ...filters } = params;
  return useQuery({
    queryKey: productKeys.list({ ...filters, page, size, sort }),
    queryFn: async (): Promise<PageResponse<ProductResponse>> => {
      const s = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") s.set(key, String(value));
      });
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

export function useProductSection(id: number, section: string) {
  return useQuery({
    queryKey: productKeys.section(id, section),
    queryFn: async (): Promise<ProductEvidence[]> => (await api.get(`/api/products/${id}/${section}`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useProductTraceability(id: number) {
  return useQuery({
    queryKey: productKeys.traceability(id),
    queryFn: async (): Promise<ProductTraceability> => (await api.get(`/api/products/${id}/traceability`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useProductIsoReadiness(id: number) {
  return useQuery({
    queryKey: productKeys.readiness(id),
    queryFn: async (): Promise<IsoReadiness> => (await api.get(`/api/products/${id}/iso-readiness`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useProductApprovalHistory(id: number) {
  return useQuery({
    queryKey: productKeys.history(id),
    queryFn: async (): Promise<ProductApprovalHistory[]> => (await api.get(`/api/products/${id}/approval-history`)).data,
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

export interface ProductInput {
  name: string;
  dosageForm?: DosageForm;
  productType?: string | null;
  category?: string | null;
  strength?: string | null;
  description?: string | null;
  intendedUse?: string | null;
  criticality?: ProductCriticality;
  ownerId?: number | null;
  department?: string | null;
  siteLocation?: string | null;
  revision?: string | null;
  specificationReference?: string | null;
  storageRequirements?: string | null;
  shelfLife?: string | null;
  expiryRequired?: boolean;
  qcTestingRequired?: boolean;
  batchLotTrackingRequired?: boolean;
  regulatoryCustomerRequirements?: string | null;
  notes?: string | null;
  registrationNumber?: string | null;
}

export type CreateProductInput = ProductInput;

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput): Promise<ProductResponse> => (await api.post("/api/products", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export interface UpdateProductInput extends Partial<ProductInput> {
  id: number;
  expectedVersion: number;
  reason?: string;
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateProductInput): Promise<ProductResponse> => (await api.put(`/api/products/${id}`, body)).data,
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(p.id) });
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export type ProductAction = "submit-for-approval" | "submit" | "reject" | "put-on-hold" | "suspend" | "resume" | "discontinue" | "obsolete" | "revise";

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: productKeys.detail(id) });
  qc.invalidateQueries({ queryKey: productKeys.all });
  qc.invalidateQueries({ queryKey: productKeys.audit(id) });
  qc.invalidateQueries({ queryKey: productKeys.history(id) });
  qc.invalidateQueries({ queryKey: productKeys.traceability(id) });
  qc.invalidateQueries({ queryKey: productKeys.readiness(id) });
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

export function useAddProductEvidence(id: number, section: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<ProductEvidence> => (await api.post(`/api/products/${id}/${section}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.section(id, section) });
      qc.invalidateQueries({ queryKey: productKeys.traceability(id) });
      qc.invalidateQueries({ queryKey: productKeys.audit(id) });
      qc.invalidateQueries({ queryKey: productKeys.readiness(id) });
    },
  });
}
