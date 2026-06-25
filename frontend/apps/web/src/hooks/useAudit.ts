"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  AuditActionPlan,
  AuditChecklistItem,
  AuditEvidence,
  AuditFinding,
  AuditFollowUp,
  AuditLinkedRecord,
  AuditMeeting,
  AuditResponse,
  AuditStatus,
  AuditTypeKey,
} from "@/types/audit";

const FIVE_MIN = 5 * 60 * 1000;

// ─── Query key registry ───────────────────────────────────────────────────────

export interface AuditListParams {
  status?: AuditStatus | "";
  type?: AuditTypeKey | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const auditKeys = {
  all: ["audits"] as const,
  list: (p: AuditListParams) => ["audits", "list", p] as const,
  detail: (id: number) => ["audits", "detail", id] as const,
  followups: (id: number) => ["audits", id, "follow-up"] as const,
  trail: (id: number) => ["audits", id, "trail"] as const,
  checklist: (id: number) => ["audits", id, "checklist"] as const,
  evidence: (id: number) => ["audits", id, "evidence"] as const,
  findings: (id: number) => ["audits", id, "findings"] as const,
  actionPlans: (id: number) => ["audits", id, "action-plans"] as const,
  meetings: (id: number) => ["audits", id, "meetings"] as const,
  linkedRecords: (id: number) => ["audits", id, "linked-records"] as const,
};

// ─── List / Detail ────────────────────────────────────────────────────────────

export function useAuditList(params: AuditListParams) {
  const { status, type, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: auditKeys.list({ status, type, page, size, sort }),
    queryFn: async (): Promise<PageResponse<AuditResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      if (type) s.set("type", type);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/audits?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAudit(id: number) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: async (): Promise<AuditResponse> => (await api.get(`/api/audits/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

// ─── Follow-ups & Audit Trail ─────────────────────────────────────────────────

export function useAuditFollowUps(id: number) {
  return useQuery({
    queryKey: auditKeys.followups(id),
    queryFn: async (): Promise<AuditFollowUp[]> =>
      (await api.get(`/api/audits/${id}/follow-up`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAuditTrail(id: number) {
  return useQuery({
    queryKey: auditKeys.trail(id),
    queryFn: async (): Promise<AuditEntry[]> =>
      (await api.get(`/api/audits/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateAuditInput {
  auditTitle: string;
  auditType: string;
  auditCategory?: string | null;
  objective?: string | null;
  scope?: string | null;
  criteria?: string | null;
  department?: string | null;
  processArea?: string | null;
  site?: string | null;
  relatedModule?: string | null;
  riskLevel?: string | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  leadAuditorId?: number | null;
  auditeeOwnerId?: number | null;
  auditSponsorId?: number | null;
  method?: string | null;
  frequency?: string | null;
  reasonForAudit?: string | null;
  previousAuditId?: number | null;
  checklistRequired?: boolean;
  openingMeetingRequired?: boolean;
  closingMeetingRequired?: boolean;
  auditorIndependenceConfirmed?: boolean;
  // Legacy fields
  auditDate?: string | null;
  auditeeId?: number | null;
}

export function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAuditInput): Promise<AuditResponse> =>
      (await api.post("/api/audits", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: auditKeys.all }),
  });
}

// ─── Update / Status transitions ─────────────────────────────────────────────

export function useUpdateAuditDetails(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditResponse> =>
      (await api.patch(`/api/audits/${id}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
      qc.invalidateQueries({ queryKey: auditKeys.all });
    },
  });
}

export function useCloseAudit(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { closureComments?: string; expectedVersion?: number }): Promise<AuditResponse> =>
      (await api.post(`/api/audits/${id}/close`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
      qc.invalidateQueries({ queryKey: auditKeys.all });
      qc.invalidateQueries({ queryKey: auditKeys.trail(id) });
    },
  });
}

export function useReopenAudit(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { reason?: string; expectedVersion?: number }): Promise<AuditResponse> =>
      (await api.post(`/api/audits/${id}/reopen`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
      qc.invalidateQueries({ queryKey: auditKeys.all });
      qc.invalidateQueries({ queryKey: auditKeys.trail(id) });
    },
  });
}

export function useCancelAudit(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { reason?: string; expectedVersion?: number }): Promise<AuditResponse> =>
      (await api.post(`/api/audits/${id}/cancel`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
      qc.invalidateQueries({ queryKey: auditKeys.all });
      qc.invalidateQueries({ queryKey: auditKeys.trail(id) });
    },
  });
}

// Generic action caller (kept for backward compat)
export function useAuditAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/audits/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
      qc.invalidateQueries({ queryKey: auditKeys.all });
      qc.invalidateQueries({ queryKey: auditKeys.followups(id) });
      qc.invalidateQueries({ queryKey: auditKeys.trail(id) });
    },
  });
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export function useAuditChecklist(id: number) {
  return useQuery({
    queryKey: auditKeys.checklist(id),
    queryFn: async (): Promise<AuditChecklistItem[]> =>
      (await api.get(`/api/audits/${id}/checklist`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddChecklistItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditChecklistItem> =>
      (await api.post(`/api/audits/${id}/checklist`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.checklist(id) });
    },
  });
}

export function useUpdateChecklistItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      ...body
    }: { itemId: number } & Record<string, unknown>): Promise<AuditChecklistItem> =>
      (await api.patch(`/api/audits/${id}/checklist/${itemId}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.checklist(id) });
    },
  });
}

export function useDeleteChecklistItem(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: number }): Promise<void> =>
      (await api.delete(`/api/audits/${id}/checklist/${itemId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.checklist(id) });
    },
  });
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

export function useAuditEvidence(id: number) {
  return useQuery({
    queryKey: auditKeys.evidence(id),
    queryFn: async (): Promise<AuditEvidence[]> =>
      (await api.get(`/api/audits/${id}/evidence`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddEvidence(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditEvidence> =>
      (await api.post(`/api/audits/${id}/evidence`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.evidence(id) });
    },
  });
}

// ─── Findings ─────────────────────────────────────────────────────────────────

export function useAuditFindings(id: number) {
  return useQuery({
    queryKey: auditKeys.findings(id),
    queryFn: async (): Promise<AuditFinding[]> =>
      (await api.get(`/api/audits/${id}/findings`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddFinding(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditFinding> =>
      (await api.post(`/api/audits/${id}/findings`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.findings(id) });
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}

export function useUpdateFinding(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      findingId,
      ...body
    }: { findingId: number } & Record<string, unknown>): Promise<AuditFinding> =>
      (await api.patch(`/api/audits/${id}/findings/${findingId}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.findings(id) });
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}

export function useAcknowledgeFinding(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      findingId,
      ...body
    }: { findingId: number } & Record<string, unknown>): Promise<AuditFinding> =>
      (await api.post(`/api/audits/${id}/findings/${findingId}/acknowledge`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.findings(id) });
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}

export function useCloseFinding(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      findingId,
      ...body
    }: { findingId: number } & Record<string, unknown>): Promise<AuditFinding> =>
      (await api.post(`/api/audits/${id}/findings/${findingId}/close`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.findings(id) });
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}

// ─── Action Plans ─────────────────────────────────────────────────────────────

export function useAuditActionPlans(id: number) {
  return useQuery({
    queryKey: auditKeys.actionPlans(id),
    queryFn: async (): Promise<AuditActionPlan[]> =>
      (await api.get(`/api/audits/${id}/action-plans`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddActionPlan(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditActionPlan> =>
      (await api.post(`/api/audits/${id}/action-plans`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.actionPlans(id) });
    },
  });
}

export function useUpdateActionPlan(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      actionId,
      ...body
    }: { actionId: number } & Record<string, unknown>): Promise<AuditActionPlan> =>
      (await api.patch(`/api/audits/${id}/action-plans/${actionId}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.actionPlans(id) });
    },
  });
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export function useAuditMeetings(id: number) {
  return useQuery({
    queryKey: auditKeys.meetings(id),
    queryFn: async (): Promise<AuditMeeting[]> =>
      (await api.get(`/api/audits/${id}/meetings`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddMeeting(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditMeeting> =>
      (await api.post(`/api/audits/${id}/meetings`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.meetings(id) });
    },
  });
}

export function useUpdateMeeting(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      ...body
    }: { meetingId: number } & Record<string, unknown>): Promise<AuditMeeting> =>
      (await api.patch(`/api/audits/${id}/meetings/${meetingId}`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.meetings(id) });
    },
  });
}

// ─── Linked Records ───────────────────────────────────────────────────────────

export function useAuditLinkedRecords(id: number) {
  return useQuery({
    queryKey: auditKeys.linkedRecords(id),
    queryFn: async (): Promise<AuditLinkedRecord[]> =>
      (await api.get(`/api/audits/${id}/linked-records`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAddLinkedRecord(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>): Promise<AuditLinkedRecord> =>
      (await api.post(`/api/audits/${id}/linked-records`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.linkedRecords(id) });
    },
  });
}

export function useRemoveLinkedRecord(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId }: { linkId: number }): Promise<void> =>
      (await api.delete(`/api/audits/${id}/linked-records/${linkId}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.linkedRecords(id) });
    },
  });
}

// ─── CAPA creation from finding ──────────────────────────────────────────────

export function useCreateCapaFromFinding(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { findingId?: number; [key: string]: unknown }): Promise<unknown> =>
      (await api.post(`/api/audits/${id}/create-capa`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: auditKeys.detail(id) });
    },
  });
}
