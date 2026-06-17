"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type {
  ComplianceStatus,
  TrainingAssignment,
  TrainingAudience,
  TrainingFrequency,
  TrainingResponse,
  TrainingRule,
} from "@/types/training";

const FIVE_MIN = 5 * 60 * 1000;

export interface TrainingListParams {
  audience?: TrainingAudience | "";
  frequency?: TrainingFrequency | "";
  completion?: "LOW" | "MEDIUM" | "HIGH" | "";
  page?: number;
  size?: number;
  sort?: string;
}

export const trainingKeys = {
  all: ["training"] as const,
  list: (p: TrainingListParams) => ["training", "list", p] as const,
  detail: (id: number) => ["training", "detail", id] as const,
  assignments: (id: number) => ["training", id, "assignments"] as const,
  rules: (id: number) => ["training", id, "rules"] as const,
  compliance: ["training", "compliance"] as const,
  dueSoon: ["training", "due-soon"] as const,
  overdue: ["training", "overdue"] as const,
  trail: (id: number) => ["training", id, "trail"] as const,
};

export function useTrainingList(params: TrainingListParams) {
  const { audience, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: trainingKeys.list({ ...params, page, size, sort }),
    queryFn: async (): Promise<PageResponse<TrainingResponse>> => {
      const s = new URLSearchParams({ page: String(page), size: String(size), sort });
      if (audience) s.set("audience", audience);
      return (await api.get(`/api/training?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useTraining(id: number) {
  return useQuery({
    queryKey: trainingKeys.detail(id),
    queryFn: async (): Promise<TrainingResponse> => (await api.get(`/api/training/${id}`)).data,
    enabled: id > 0,
    staleTime: FIVE_MIN,
  });
}

export function useTrainingAssignments(id: number) {
  return useQuery({ queryKey: trainingKeys.assignments(id), queryFn: async (): Promise<TrainingAssignment[]> => (await api.get(`/api/training/${id}/assignments`)).data, enabled: id > 0 });
}
export function useTrainingRules(id: number) {
  return useQuery({ queryKey: trainingKeys.rules(id), queryFn: async (): Promise<TrainingRule[]> => (await api.get(`/api/training/${id}/rules`)).data, enabled: id > 0 });
}
export function useTrainingCompliance() {
  return useQuery({ queryKey: trainingKeys.compliance, queryFn: async (): Promise<ComplianceStatus> => (await api.get("/api/training/compliance-status")).data });
}
export function useMyTrainings() {
  return useQuery({ queryKey: trainingKeys.dueSoon, queryFn: async (): Promise<TrainingAssignment[]> => (await api.get("/api/training/due-soon")).data });
}
export function useTrainingTrail(id: number) {
  return useQuery({ queryKey: trainingKeys.trail(id), queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/training/${id}/audit-trail`)).data, enabled: id > 0 });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      content: string;
      intendedAudience: TrainingAudience;
      requiredFrequency: TrainingFrequency;
      numbering?: string | null;
      trainingType?: string | null;
      occurrence?: string | null;
      startAt?: string | null;
      endAt?: string | null;
      completionTargetAt?: string | null;
      releaseMode?: string | null;
      releaseAt?: string | null;
      mainTrainerName?: string | null;
      additionalTrainers?: string[];
      internalDocuments?: string[];
      learningObjectives?: string | null;
      assessmentCriteria?: string | null;
      sessions?: Array<{ sessionIndex: number; startAt?: string | null; endAt?: string | null }>;
    }): Promise<TrainingResponse> =>
      (await api.post("/api/training", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.all }),
  });
}

export function useTrainingAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/training/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all });
      qc.invalidateQueries({ queryKey: trainingKeys.detail(id) });
      qc.invalidateQueries({ queryKey: trainingKeys.assignments(id) });
      qc.invalidateQueries({ queryKey: trainingKeys.rules(id) });
      qc.invalidateQueries({ queryKey: trainingKeys.compliance });
      qc.invalidateQueries({ queryKey: trainingKeys.trail(id) });
    },
  });
}
