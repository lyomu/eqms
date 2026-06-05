"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ReportData } from "@/types/report";

export function useReport(slug: string) {
  return useQuery({
    queryKey: ["reports", slug],
    queryFn: async (): Promise<ReportData> => (await api.get(`/api/reports/${slug}`)).data,
    staleTime: 60_000,
    enabled: !!slug,
  });
}

/**
 * URL for the CSV/XLSX export endpoint. The browser downloads it via a same-origin link
 * (proxy carries the session cookie); the backend records an audited EXPORT action.
 */
export function exportUrl(type: string, format: "CSV" | "XLSX" = "CSV"): string {
  return `/api/reports/export?type=${encodeURIComponent(type)}&format=${format}`;
}
