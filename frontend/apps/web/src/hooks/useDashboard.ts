"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ComplianceStatus,
  DashboardStatistics,
  MyWork,
  PendingApprovals,
  TaskItem,
} from "@/types/dashboard";

/** React Query hooks for the read-only dashboard endpoints (/api/dashboard/*). */

export function useMyWork() {
  return useQuery({
    queryKey: ["dashboard", "my-work"],
    queryFn: async (): Promise<MyWork> => (await api.get("/api/dashboard/my-work")).data,
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: ["dashboard", "statistics"],
    queryFn: async (): Promise<DashboardStatistics> =>
      (await api.get("/api/dashboard/statistics")).data,
  });
}

export function useMyApprovals() {
  return useQuery({
    queryKey: ["dashboard", "my-approvals"],
    queryFn: async (): Promise<PendingApprovals> =>
      (await api.get("/api/dashboard/my-approvals")).data,
  });
}

export function useDueSoon() {
  return useQuery({
    queryKey: ["dashboard", "due-soon"],
    queryFn: async (): Promise<TaskItem[]> => (await api.get("/api/dashboard/due-soon")).data,
  });
}

export function useOverdueItems() {
  return useQuery({
    queryKey: ["dashboard", "overdue-items"],
    queryFn: async (): Promise<TaskItem[]> => (await api.get("/api/dashboard/overdue-items")).data,
  });
}

export function useComplianceStatus() {
  return useQuery({
    queryKey: ["dashboard", "compliance-status"],
    queryFn: async (): Promise<ComplianceStatus> => (await api.get("/api/dashboard/compliance-status")).data,
  });
}
