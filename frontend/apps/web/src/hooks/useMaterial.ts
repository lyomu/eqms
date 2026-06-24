"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  MaterialResponse,
  MaterialStatus,
  MaterialType,
  UnitOfMeasure,
  MaterialLot,
  MaterialSupplierLink,
  MaterialInventoryLedger,
  MaterialQualityIssueLink,
} from "@/types/material";

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
  suppliers: (id: number) => ["materials", id, "suppliers"] as const,
  lots: (id: number) => ["materials", id, "lots"] as const,
  receipts: (id: number) => ["materials", id, "receipts"] as const,
  ledger: (id: number) => ["materials", id, "ledger"] as const,
  qualityIssues: (id: number) => ["materials", id, "quality-issues"] as const,
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
  // Extended fields
  category?: string | null;
  criticality?: string | null;
  intendedUse?: string | null;
  grade?: string | null;
  casNumber?: string | null;
  specificationReference?: string | null;
  standardStorageCondition?: string | null;
  qcTestingRequired?: boolean;
  samplingRequired?: boolean;
  coaRequired?: boolean;
  sdsRequired?: boolean;
  approvedSupplierRequired?: boolean;
  expiryDateRequired?: boolean;
  retestDateRequired?: boolean;
  quarantineRequiredOnReceipt?: boolean;
  qaReleaseRequiredBeforeUse?: boolean;
  riskAssessmentRequired?: boolean;
  minimumStockLevel?: number | null;
  maximumStockLevel?: number | null;
  reorderLevel?: number | null;
  reorderQuantity?: number | null;
  fefoRequired?: boolean;
  fifoRequired?: boolean;
  defaultWarehouse?: string | null;
  defaultStorageLocation?: string | null;
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

// PATCH /api/materials/{id} — update extended details
export interface UpdateMaterialDetailsInput {
  id: number;
  expectedVersion: number;
  [key: string]: unknown;
}

export function useUpdateMaterialDetails(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id: _id, ...body }: UpdateMaterialDetailsInput): Promise<MaterialResponse> =>
      (await api.patch(`/api/materials/${_id}`, body)).data,
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: materialKeys.detail(id) });
      qc.invalidateQueries({ queryKey: materialKeys.all });
      qc.invalidateQueries({ queryKey: materialKeys.audit(m.id) });
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

// ─── Supplier links ───────────────────────────────────────────────────────────

export function useMaterialSuppliers(id: number) {
  return useQuery({
    queryKey: materialKeys.suppliers(id),
    queryFn: async (): Promise<MaterialSupplierLink[]> =>
      (await api.get(`/api/materials/${id}/suppliers`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddSupplierLink(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<MaterialSupplierLink> =>
      (await api.post(`/api/materials/${id}/suppliers`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: materialKeys.suppliers(id) }),
  });
}

export function useRemoveSupplierLink(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: number): Promise<void> => {
      await api.delete(`/api/materials/${id}/suppliers/${linkId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: materialKeys.suppliers(id) }),
  });
}

// ─── Lots ─────────────────────────────────────────────────────────────────────

export function useMaterialLots(id: number) {
  return useQuery({
    queryKey: materialKeys.lots(id),
    queryFn: async (): Promise<MaterialLot[]> =>
      (await api.get(`/api/materials/${id}/lots`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useReceiveMaterial(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<MaterialLot> =>
      (await api.post(`/api/materials/${id}/receipts`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: materialKeys.lots(id) });
      qc.invalidateQueries({ queryKey: materialKeys.receipts(id) });
      qc.invalidateQueries({ queryKey: materialKeys.ledger(id) });
    },
  });
}

export function useMaterialReceipts(id: number) {
  return useQuery({
    queryKey: materialKeys.receipts(id),
    queryFn: async (): Promise<MaterialLot[]> =>
      (await api.get(`/api/materials/${id}/receipts`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

// ─── Lot actions ──────────────────────────────────────────────────────────────

function invalidateLots(qc: ReturnType<typeof useQueryClient>, materialId: number) {
  qc.invalidateQueries({ queryKey: materialKeys.lots(materialId) });
  qc.invalidateQueries({ queryKey: materialKeys.ledger(materialId) });
  qc.invalidateQueries({ queryKey: materialKeys.audit(materialId) });
}

export function useReleaseLot(materialId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotId, ...body }: { lotId: number; expectedVersion: number; reason?: string; releaseConditions?: string }): Promise<MaterialLot> =>
      (await api.post(`/api/materials/${materialId}/lots/${lotId}/release`, body)).data,
    onSuccess: () => invalidateLots(qc, materialId),
  });
}

export function useRejectLot(materialId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotId, ...body }: { lotId: number; reason: string; expectedVersion?: number }): Promise<MaterialLot> =>
      (await api.post(`/api/materials/${materialId}/lots/${lotId}/reject`, body)).data,
    onSuccess: () => invalidateLots(qc, materialId),
  });
}

export function useHoldLot(materialId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotId, ...body }: { lotId: number; reason: string; expectedVersion?: number }): Promise<MaterialLot> =>
      (await api.post(`/api/materials/${materialId}/lots/${lotId}/hold`, body)).data,
    onSuccess: () => invalidateLots(qc, materialId),
  });
}

export function useDisposeLot(materialId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotId, ...body }: { lotId: number; reason: string; expectedVersion?: number }): Promise<MaterialLot> =>
      (await api.post(`/api/materials/${materialId}/lots/${lotId}/dispose`, body)).data,
    onSuccess: () => invalidateLots(qc, materialId),
  });
}

export function useIssueMaterial(materialId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lotId, ...body }: {
      lotId: number;
      quantityIssued: number;
      issuedTo?: string;
      department?: string;
      batchWorkOrderRef?: string;
      issueDate: string;
      purposeOfUse?: string;
      usageNotes?: string;
    }): Promise<MaterialLot> =>
      (await api.post(`/api/materials/${materialId}/lots/${lotId}/issue`, body)).data,
    onSuccess: () => invalidateLots(qc, materialId),
  });
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export function useMaterialLedger(id: number) {
  return useQuery({
    queryKey: materialKeys.ledger(id),
    queryFn: async (): Promise<MaterialInventoryLedger[]> =>
      (await api.get(`/api/materials/${id}/ledger`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

// ─── Quality issues ───────────────────────────────────────────────────────────

export function useMaterialQualityIssues(id: number) {
  return useQuery({
    queryKey: materialKeys.qualityIssues(id),
    queryFn: async (): Promise<MaterialQualityIssueLink[]> =>
      (await api.get(`/api/materials/${id}/quality-issues`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddQualityIssueLink(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<MaterialQualityIssueLink> =>
      (await api.post(`/api/materials/${id}/quality-issues`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: materialKeys.qualityIssues(id) }),
  });
}

export function useRemoveQualityIssueLink(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: number): Promise<void> => {
      await api.delete(`/api/materials/${id}/quality-issues/${linkId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: materialKeys.qualityIssues(id) }),
  });
}
