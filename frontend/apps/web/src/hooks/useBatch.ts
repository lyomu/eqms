"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { BatchRecordResponse, BatchStatus, BatchTraceability, QcTestStatus } from "@/types/batch";

const FIVE_MIN = 5 * 60 * 1000;

export interface BatchListParams {
  status?: BatchStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const batchKeys = {
  all: ["batch-records"] as const,
  list: (p: BatchListParams) => ["batch-records", "list", p] as const,
  detail: (id: number) => ["batch-records", "detail", id] as const,
  traceability: (id: number) => ["batch-records", id, "traceability"] as const,
  audit: (id: number) => ["batch-records", id, "audit"] as const,
};

export function useBatchList(params: BatchListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: batchKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<BatchRecordResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/batch-records?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useBatch(id: number) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: async (): Promise<BatchRecordResponse> => (await api.get(`/api/batch-records/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useBatchTraceability(id: number) {
  return useQuery({
    queryKey: batchKeys.traceability(id),
    queryFn: async (): Promise<BatchTraceability> => (await api.get(`/api/batch-records/${id}/traceability`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useBatchDeviations(id: number) {
  return useQuery({
    queryKey: ["batch-records", id, "deviations"],
    queryFn: async (): Promise<number[]> => (await api.get(`/api/batch-records/${id}/deviations`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useBatchAudit(id: number) {
  return useQuery({
    queryKey: batchKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/batch-records/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateBatchInput {
  productId: number;
  productCode: string;
  batchSize: number;
  unit: string;
  manufacturingStartDate: string;
  notes?: string | null;
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBatchInput): Promise<BatchRecordResponse> =>
      (await api.post("/api/batch-records", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: batchKeys.all }),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id: number) {
  qc.invalidateQueries({ queryKey: batchKeys.detail(id) });
  qc.invalidateQueries({ queryKey: batchKeys.traceability(id) });
  qc.invalidateQueries({ queryKey: batchKeys.audit(id) });
  qc.invalidateQueries({ queryKey: batchKeys.all });
}

/* ---- child record operations ---- */

export function useRecordStep(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      stepNumber: number; stepDescription: string; equipmentUsed?: string | null;
      operatorId?: number | null; startTime: string; endTime?: string | null;
      parametersRecorded?: string | null; anomaliesNoted?: string | null;
    }) => (await api.post(`/api/batch-records/${id}/record-step`, body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}

export function useLinkMaterial(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      materialId?: number | null; materialCode: string; lotNumber: string;
      supplier?: string | null; quantityUsed: number; unit: string;
    }) => (await api.post(`/api/batch-records/${id}/link-material`, body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}

export function useLinkQcTest(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      testMethod: string; specificationLimit: string; actualResult: string;
      testDate: string; testStatus: QcTestStatus; testLab?: string | null; approvedBy?: number | null;
    }) => (await api.post(`/api/batch-records/${id}/link-qc-test`, body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}

export function useAddProduct(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      productId?: number | null; productCode: string; lotNumberAssigned: string; quantity: number; unit: string;
    }) => (await api.post(`/api/batch-records/${id}/add-product`, body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}

export function useRecordBatchDeviation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { deviationId: number; reason?: string }) =>
      (await api.post(`/api/batch-records/${id}/record-deviation`, body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}

/* ---- workflow ---- */

export type BatchAction = "qa-review" | "reject" | "quarantine" | "recall";

export function useBatchTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; action: BatchAction; expectedVersion: number; reason?: string }): Promise<BatchRecordResponse> =>
      (await api.post(`/api/batch-records/${vars.id}/${vars.action}`, { expectedVersion: vars.expectedVersion, reason: vars.reason })).data,
    onSuccess: (b) => invalidate(qc, b.id),
  });
}

export function useReleaseBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; expectedVersion: number; reason?: string; password: string; totpCode?: string; meaningStatement: string }): Promise<BatchRecordResponse> =>
      (await api.post(`/api/batch-records/${id}/release`, body)).data,
    onSuccess: (b) => invalidate(qc, b.id),
  });
}

export function useUpdateBatch(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { expectedVersion: number; manufacturingEndDate?: string | null; notes?: string | null; reason?: string }): Promise<BatchRecordResponse> =>
      (await api.put(`/api/batch-records/${id}`, body)).data,
    onSuccess: () => invalidate(qc, id),
  });
}
