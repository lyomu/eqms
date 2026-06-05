"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PageResponse } from "@/types/common";
import type { NotificationResponse } from "@/types/notification";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (unreadOnly: boolean, page: number) => ["notifications", "list", unreadOnly, page] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export function useNotifications(unreadOnly: boolean, page: number) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly, page),
    queryFn: async (): Promise<PageResponse<NotificationResponse>> => {
      const s = new URLSearchParams({ unreadOnly: String(unreadOnly), page: String(page), size: "20", sort: "createdAt,desc" });
      return (await api.get(`/api/notifications?${s.toString()}`)).data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async (): Promise<number> => (await api.get("/api/notifications/unread-count")).data.unread,
    refetchInterval: 30_000, // poll every 30s
    staleTime: 15_000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/api/notifications/${id}/mark-read`)).data,
    onSuccess: () => invalidate(qc),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/api/notifications/mark-all-read")).data,
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/api/notifications/${id}`)).data,
    onSuccess: () => invalidate(qc),
  });
}
