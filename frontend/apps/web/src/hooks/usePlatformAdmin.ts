"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PlatformModule, PlatformOrganization, PlatformPlan } from "@/types/platform";

export const platformKeys = {
  organizations: ["platform", "organizations"] as const,
  organization: (id: number) => ["platform", "organizations", id] as const,
  plans: ["platform", "plans"] as const,
  modules: ["platform", "modules"] as const,
};

export function usePlatformOrganizations() {
  return useQuery({
    queryKey: platformKeys.organizations,
    queryFn: async (): Promise<PlatformOrganization[]> =>
      (await api.get("/api/platform/organizations")).data,
  });
}

export function usePlatformOrganization(id: number) {
  return useQuery({
    queryKey: platformKeys.organization(id),
    queryFn: async (): Promise<PlatformOrganization> =>
      (await api.get(`/api/platform/organizations/${id}`)).data,
    enabled: id > 0,
  });
}

export function usePlatformPlans() {
  return useQuery({
    queryKey: platformKeys.plans,
    queryFn: async (): Promise<PlatformPlan[]> => (await api.get("/api/platform/plans")).data,
  });
}

export function usePlatformModules() {
  return useQuery({
    queryKey: platformKeys.modules,
    queryFn: async (): Promise<PlatformModule[]> => (await api.get("/api/platform/modules")).data,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>): Promise<PlatformOrganization> =>
      (await api.post("/api/platform/organizations", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.organizations }),
  });
}

export function useOrganizationAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { action: string; body?: Record<string, unknown> }): Promise<PlatformOrganization> =>
      (await api.post(`/api/platform/organizations/${id}/${vars.action}`, vars.body ?? {})).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformKeys.organizations });
      qc.invalidateQueries({ queryKey: platformKeys.organization(id) });
    },
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>): Promise<PlatformPlan> =>
      (await api.post("/api/platform/plans", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: platformKeys.plans }),
  });
}
