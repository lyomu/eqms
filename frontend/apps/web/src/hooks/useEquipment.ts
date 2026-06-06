"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditEntry, PageResponse } from "@/types/common";
import type { EquipmentResponse, EquipmentStatus, EquipmentType } from "@/types/equipment";

const FIVE_MIN = 5 * 60 * 1000;

export interface EquipmentListParams {
  status?: EquipmentStatus | "";
  type?: EquipmentType | "";
  location?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const equipmentKeys = {
  all: ["equipment"] as const,
  list: (p: EquipmentListParams) => ["equipment", "list", p] as const,
  detail: (id: number) => ["equipment", "detail", id] as const,
  trail: (id: number) => ["equipment", id, "trail"] as const,
};

export function useEquipmentList(params: EquipmentListParams) {
  const { status, type, location, page = 0, size = 10, sort = "createdAt,desc" } = params;
  return useQuery({
    queryKey: equipmentKeys.list({ status, type, location, page, size, sort }),
    queryFn: async (): Promise<PageResponse<EquipmentResponse>> => {
      const s = new URLSearchParams();
      if (status) s.set("status", status);
      if (type) s.set("type", type);
      if (location) s.set("location", location);
      s.set("page", String(page));
      s.set("size", String(size));
      s.set("sort", sort);
      return (await api.get(`/api/equipment?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useEquipment(id: number) {
  return useQuery({
    queryKey: equipmentKeys.detail(id),
    queryFn: async (): Promise<EquipmentResponse> => (await api.get(`/api/equipment/${id}`)).data,
    staleTime: FIVE_MIN,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useEquipmentTrail(id: number) {
  return useQuery({
    queryKey: equipmentKeys.trail(id),
    queryFn: async (): Promise<AuditEntry[]> => (await api.get(`/api/equipment/${id}/audit-trail`)).data,
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface CreateEquipmentInput {
  equipmentName: string;
  equipmentType: EquipmentType;
  manufacturer: string;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  acquisitionDate?: string | null;
  calibrationFrequencyMonths?: number | null;
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEquipmentInput): Promise<EquipmentResponse> =>
      (await api.post("/api/equipment", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: equipmentKeys.all }),
  });
}

export function useEquipmentAction(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { path: string; body: Record<string, unknown> }) =>
      (await api.post(`/api/equipment/${id}/${vars.path}`, vars.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: equipmentKeys.all });
      qc.invalidateQueries({ queryKey: equipmentKeys.trail(id) });
    },
  });
}
