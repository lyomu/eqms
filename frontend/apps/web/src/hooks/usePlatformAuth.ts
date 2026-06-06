"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PlatformAdminResponse } from "@/types/platform-auth";

export const PLATFORM_ME_QUERY_KEY = ["platform-auth", "me"] as const;

async function fetchPlatformMe(): Promise<PlatformAdminResponse | null> {
  try {
    return (await api.get<PlatformAdminResponse>("/api/platform/auth/me")).data;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) return null;
    throw err;
  }
}

export function usePlatformAuth() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: PLATFORM_ME_QUERY_KEY,
    queryFn: fetchPlatformMe,
    staleTime: 60_000,
    retry: false,
  });

  const login = useMutation({
    mutationFn: async (input: { email: string; password: string }): Promise<PlatformAdminResponse> =>
      (await api.post("/api/platform/auth/login", input)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: PLATFORM_ME_QUERY_KEY });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.post("/api/platform/auth/logout");
    },
    onSuccess: () => {
      qc.setQueryData(PLATFORM_ME_QUERY_KEY, null);
      router.replace("/platform/login");
    },
  });

  return {
    currentAdmin: me.data ?? null,
    isAuthenticated: !!me.data,
    isLoading: me.isLoading,
    login,
    logout,
    refetchMe: me.refetch,
  };
}
