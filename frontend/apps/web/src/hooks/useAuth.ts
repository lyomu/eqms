"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type {
  LoginResponse,
  MeResponse,
  MfaEnrollResponse,
  PasswordResetRequestResponse,
} from "@/types/auth";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/** Fetch the current user. 401 => returns null (not authenticated) rather than throwing. */
async function fetchMe(): Promise<MeResponse | null> {
  try {
    const { data } = await api.get<MeResponse>("/api/auth/me");
    return data;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) return null;
    throw err;
  }
}

/**
 * Central auth hook. The backend is session-based (cookie), so "is authenticated"
 * is derived from GET /api/auth/me, never from local token state.
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  /** Step 1: email + password. Returns the LoginStatus for the caller to route on. */
  const login = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const { data } = await api.post<LoginResponse>("/api/auth/login", vars);
      return data;
    },
    onSuccess: async (data) => {
      // Refetch /me so ProtectedRoute sees isAuthenticated=true before router.push fires.
      if (data.status === "AUTHENTICATED") {
        await queryClient.refetchQueries({ queryKey: ME_QUERY_KEY });
      }
    },
  });

  /** Step 2a: fetch enrollment material (only when status === ENROLLMENT_REQUIRED). */
  const enrollMfa = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<MfaEnrollResponse>("/api/auth/mfa/enroll");
      return data;
    },
  });

  /** Step 2b: verify the 6-digit TOTP code. On AUTHENTICATED, refresh /me. */
  const verifyMfa = useMutation({
    mutationFn: async (vars: { code: string }) => {
      const { data } = await api.post<LoginResponse>("/api/auth/mfa/verify", vars);
      return data;
    },
    onSuccess: async (data) => {
      if (data.status === "AUTHENTICATED") {
        await queryClient.refetchQueries({ queryKey: ME_QUERY_KEY });
      }
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.post("/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.clear();
      router.replace("/login");
    },
  });

  return {
    currentUser: meQuery.data ?? null,
    isAuthenticated: !!meQuery.data,
    isLoading: meQuery.isLoading,
    isError: meQuery.isError,
    refetchMe: meQuery.refetch,
    login,
    enrollMfa,
    verifyMfa,
    logout,
  };
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (vars: { email: string }) => {
      const { data } = await api.post<PasswordResetRequestResponse>(
        "/api/auth/password-reset/request",
        vars
      );
      return data;
    },
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async (vars: { token: string; newPassword: string }) => {
      await api.post("/api/auth/password-reset/confirm", vars);
    },
  });
}
