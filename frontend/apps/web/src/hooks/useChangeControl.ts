"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  ChangeControlResponse,
  ChangeStatus,
  ChangeTypeKey,
} from "@/types/change-control";

const FIVE_MIN = 5 * 60 * 1000;

export interface ChangeListParams {
  status?: ChangeStatus | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const changeKeys = {
  all: ["change-controls"] as const,
  list: (p: ChangeListParams) => ["change-controls", "list", p] as const,
  detail: (id: number) => ["change-controls", "detail", id] as const,
  audit: (id: number) => ["change-controls", id, "audit"] as const,
};

export function useChangeList(params: ChangeListParams) {
  const { status, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: changeKeys.list({ status, page, size, sort }),
    queryFn: async (): Promise<PageResponse<ChangeControlResponse>> => {
      const search = new URLSearchParams();
      if (status) search.set("status", status);
      search.set("page", String(page));
      search.set("size", String(size));
      search.set("sort", sort);
      return (await api.get(`/api/change-controls?${search.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useChange(id: number) {
  return useQuery({
    queryKey: changeKeys.detail(id),
    queryFn: async (): Promise<ChangeControlResponse> =>
      (await api.get(`/api/change-controls/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useChangeAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: changeKeys.audit(id),
    queryFn: async (): Promise<AuditEntry[]> =>
      (await api.get(`/api/change-controls/${id}/audit-trail`)).data,
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export interface CreateChangeInput {
  title: string;
  type: ChangeTypeKey;
  description: string;
  justification?: string | null;
  effectivenessCheckRequired: boolean;
  targetImplementationDate?: string | null;
}

export function useCreateChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChangeInput): Promise<ChangeControlResponse> =>
      (await api.post("/api/change-controls", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: changeKeys.all }),
  });
}

/** Simple workflow actions: { expectedVersion, reason }. */
export type ChangeAction =
  | "submit-for-review"
  | "submit-for-approval"
  | "reject"
  | "start-implementation"
  | "complete-implementation"
  | "submit-for-closure"
  | "close"
  | "cancel";

export function useChangeAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: number;
      action: ChangeAction;
      expectedVersion: number;
      reason?: string;
    }): Promise<ChangeControlResponse> =>
      (
        await api.post(`/api/change-controls/${vars.id}/${vars.action}`, {
          expectedVersion: vars.expectedVersion,
          reason: vars.reason,
        })
      ).data,
    onSuccess: (cc) => {
      qc.invalidateQueries({ queryKey: changeKeys.detail(cc.id) });
      qc.invalidateQueries({ queryKey: changeKeys.all });
      qc.invalidateQueries({ queryKey: changeKeys.audit(cc.id) });
    },
  });
}

export interface ApproveChangeInput {
  id: number;
  expectedVersion: number;
  reason?: string;
  password: string;
  totpCode?: string;
  meaningStatement: string;
}

export function useApproveChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: ApproveChangeInput): Promise<ChangeControlResponse> =>
      (await api.post(`/api/change-controls/${id}/approve`, body)).data,
    onSuccess: (cc) => {
      qc.invalidateQueries({ queryKey: changeKeys.detail(cc.id) });
      qc.invalidateQueries({ queryKey: changeKeys.all });
      qc.invalidateQueries({ queryKey: changeKeys.audit(cc.id) });
    },
  });
}
