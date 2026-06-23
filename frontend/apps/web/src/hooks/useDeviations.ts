"use client";

/**
 * Deviation hooks — re-exports the canonical useDeviation.ts plus adds all new
 * sub-entity hooks introduced for the extended UI (containment, impact, investigation,
 * linked records, update, reopen).
 *
 * Import from this file when you need the full set of deviation hooks.
 */

// Re-export everything from the existing file so callers can use either.
export * from "./useDeviation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ContainmentActionResponse,
  DeviationInvestigationResponse,
  DeviationResponse,
  ImpactAssessmentResponse,
  LinkedRecordResponse,
} from "@/types/deviation";
import { deviationKeys } from "./useDeviation";

// ─── Update Deviation Details ─────────────────────────────────────────────────

export function useUpdateDeviationDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      expectedVersion: number;
      [key: string]: unknown;
    }): Promise<DeviationResponse> =>
      (await api.patch(`/api/deviations/${id}`, body)).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: deviationKeys.detail(d.id) });
      qc.invalidateQueries({ queryKey: deviationKeys.all });
    },
  });
}

// ─── Reopen ──────────────────────────────────────────────────────────────────

export function useReopenDeviation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      expectedVersion: number;
      reason: string;
    }): Promise<DeviationResponse> =>
      (await api.post(`/api/deviations/${id}/reopen`, body)).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: deviationKeys.detail(d.id) });
      qc.invalidateQueries({ queryKey: deviationKeys.all });
      qc.invalidateQueries({ queryKey: deviationKeys.audit(d.id) });
    },
  });
}

// ─── Containment Actions ──────────────────────────────────────────────────────

const containmentKeys = {
  list: (deviationId: number) =>
    ["deviations", deviationId, "containment-actions"] as const,
};

export function useContainmentActions(deviationId: number) {
  return useQuery({
    queryKey: containmentKeys.list(deviationId),
    queryFn: async (): Promise<ContainmentActionResponse[]> =>
      (await api.get(`/api/deviations/${deviationId}/containment-actions`)).data,
    enabled: Number.isFinite(deviationId) && deviationId > 0,
  });
}

export function useAddContainmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      ...body
    }: {
      deviationId: number;
      description: string;
      actionType: string;
      dueDate?: string;
      comments?: string;
    }): Promise<ContainmentActionResponse> =>
      (await api.post(`/api/deviations/${deviationId}/containment-actions`, body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: containmentKeys.list(data.deviationId) });
    },
  });
}

export function useUpdateContainmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      actionId,
      ...body
    }: {
      deviationId: number;
      actionId: number;
      [key: string]: unknown;
    }): Promise<ContainmentActionResponse> =>
      (
        await api.patch(
          `/api/deviations/${deviationId}/containment-actions/${actionId}`,
          body
        )
      ).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: containmentKeys.list(data.deviationId) });
    },
  });
}

// ─── Impact Assessment ────────────────────────────────────────────────────────

const impactKeys = {
  detail: (deviationId: number) =>
    ["deviations", deviationId, "impact-assessment"] as const,
};

export function useImpactAssessment(deviationId: number) {
  return useQuery({
    queryKey: impactKeys.detail(deviationId),
    queryFn: async (): Promise<ImpactAssessmentResponse | null> => {
      try {
        return (await api.get(`/api/deviations/${deviationId}/impact-assessment`))
          .data;
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw e;
      }
    },
    enabled: Number.isFinite(deviationId) && deviationId > 0,
  });
}

export function useUpsertImpactAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      ...body
    }: {
      deviationId: number;
      [key: string]: unknown;
    }): Promise<ImpactAssessmentResponse> =>
      (await api.post(`/api/deviations/${deviationId}/impact-assessment`, body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: impactKeys.detail(data.deviationId) });
    },
  });
}

// ─── Investigation ────────────────────────────────────────────────────────────

const investigationKeys = {
  detail: (deviationId: number) =>
    ["deviations", deviationId, "investigation"] as const,
};

export function useDeviationInvestigation(deviationId: number) {
  return useQuery({
    queryKey: investigationKeys.detail(deviationId),
    queryFn: async (): Promise<DeviationInvestigationResponse | null> => {
      try {
        return (await api.get(`/api/deviations/${deviationId}/investigation`)).data;
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw e;
      }
    },
    enabled: Number.isFinite(deviationId) && deviationId > 0,
  });
}

export function useUpsertInvestigation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      ...body
    }: {
      deviationId: number;
      [key: string]: unknown;
    }): Promise<DeviationInvestigationResponse> =>
      (await api.post(`/api/deviations/${deviationId}/investigation`, body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: investigationKeys.detail(data.deviationId),
      });
    },
  });
}

// ─── Linked Records ───────────────────────────────────────────────────────────

const linkedKeys = {
  list: (deviationId: number) =>
    ["deviations", deviationId, "linked-records"] as const,
};

export function useDeviationLinkedRecords(deviationId: number) {
  return useQuery({
    queryKey: linkedKeys.list(deviationId),
    queryFn: async (): Promise<LinkedRecordResponse[]> =>
      (await api.get(`/api/deviations/${deviationId}/linked-records`)).data,
    enabled: Number.isFinite(deviationId) && deviationId > 0,
  });
}

export function useAddLinkedRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      ...body
    }: {
      deviationId: number;
      linkedRecordType: string;
      linkedRecordId: number;
      linkedRecordNumber?: string;
      notes?: string;
    }): Promise<LinkedRecordResponse> =>
      (await api.post(`/api/deviations/${deviationId}/linked-records`, body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: linkedKeys.list(data.deviationId) });
    },
  });
}

export function useRemoveLinkedRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deviationId,
      linkId,
    }: {
      deviationId: number;
      linkId: number;
    }): Promise<void> =>
      (
        await api.delete(
          `/api/deviations/${deviationId}/linked-records/${linkId}`
        )
      ).data,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: linkedKeys.list(vars.deviationId) });
    },
  });
}
