"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  OosCaseResponse,
  OosStatus,
  OosContainmentDetail,
  OosInvestigationItem,
  OosRetestResampleItem,
  OosImpactAssessmentDetail,
  OosRootCauseDetail,
  OosLinkedRecordItem,
  OosEvidenceItem,
} from "@/types/oos";

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
  title?: string | null;
  description?: string | null;
  recordType?: string | null;
  severity?: string | null;
  department?: string | null;
  lab?: string | null;
  productId?: number | null;
  testCategory?: string | null;
  testName?: string | null;
  testMethod?: string | null;
  specificationLimitMin?: number | null;
  specificationLimitMax?: number | null;
  specificationReference?: string | null;
  reportedResult: string;
  unitOfMeasure?: string | null;
  sampleId?: string | null;
  sampleType?: string | null;
  batchId?: string | null;
  analystId?: number | null;
  reportedByName?: string | null;
  equipmentId?: string | null;
  calibrationStatusAtTest?: string | null;
  reagentUsed?: string | null;
  reagentLot?: string | null;
  referenceStdLot?: string | null;
  immediateHoldRequired?: boolean;
  holdAppliedTo?: string | null;
  holdReason?: string | null;
  immediateActionTaken?: string | null;
  productionImpact?: boolean;
  releasedProductImpact?: boolean;
  customerImpact?: boolean;
  regulatoryImpact?: boolean;
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

export function useSaveContainment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosContainmentDetail> =>
      (await api.post(`/api/oos/${id}/containment`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(id) }),
  });
}

export function useSaveLabAssessment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosCaseResponse> =>
      (await api.post(`/api/oos/${id}/lab-assessment`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: oosKeys.detail(id) });
      qc.invalidateQueries({ queryKey: oosKeys.all });
    },
  });
}

export function useAddInvestigationItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosInvestigationItem> =>
      (await api.post(`/api/oos/${id}/investigation-items`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(id) }),
  });
}

export function useUpdateInvestigationItem(oosId: number, itemId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosInvestigationItem> =>
      (await api.put(`/api/oos/${oosId}/investigation-items/${itemId}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(oosId) }),
  });
}

export function useRemoveInvestigationItem(oosId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: number) =>
      (await api.delete(`/api/oos/${oosId}/investigation-items/${itemId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(oosId) }),
  });
}

export function useAddRetestResample(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosRetestResampleItem> =>
      (await api.post(`/api/oos/${id}/retest-resample`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: oosKeys.detail(id) });
      qc.invalidateQueries({ queryKey: oosKeys.all });
    },
  });
}

export function useUpdateRetestResample(oosId: number, testId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosRetestResampleItem> =>
      (await api.put(`/api/oos/${oosId}/retest-resample/${testId}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: oosKeys.detail(oosId) });
      qc.invalidateQueries({ queryKey: oosKeys.all });
    },
  });
}

export function useSaveImpactAssessment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosImpactAssessmentDetail> =>
      (await api.post(`/api/oos/${id}/impact-assessment`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(id) }),
  });
}

export function useSaveRootCause(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosRootCauseDetail> =>
      (await api.post(`/api/oos/${id}/root-cause`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(id) }),
  });
}

export function useAddLinkedRecord(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosLinkedRecordItem> =>
      (await api.post(`/api/oos/${id}/linked-records`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(id) }),
  });
}

export function useRemoveLinkedRecord(oosId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: number) =>
      (await api.delete(`/api/oos/${oosId}/linked-records/${recordId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(oosId) }),
  });
}

export function useAddEvidence(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosEvidenceItem> =>
      (await api.post(`/api/oos/${id}/evidence`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(id) }),
  });
}

export function useRemoveEvidence(oosId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evidenceId: number) =>
      (await api.delete(`/api/oos/${oosId}/evidence/${evidenceId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: oosKeys.detail(oosId) }),
  });
}

export function useQaDispose(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosCaseResponse> =>
      (await api.post(`/api/oos/${id}/qa-dispose`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: oosKeys.detail(id) });
      qc.invalidateQueries({ queryKey: oosKeys.all });
    },
  });
}

export function useReopenOos(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<OosCaseResponse> =>
      (await api.post(`/api/oos/${id}/reopen`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: oosKeys.detail(id) });
      qc.invalidateQueries({ queryKey: oosKeys.all });
    },
  });
}
