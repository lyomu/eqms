"use client";

import { usePathname } from "next/navigation";
import { useRecordIsoReadiness } from "@/hooks/useRecordDossier";

const ROUTES: Record<string, string> = {
  documents: "Document",
  capa: "Capa",
  deviations: "Deviation",
  "non-conformances": "NonConformance",
  "change-control": "ChangeControl",
  risks: "Risk",
  materials: "Material",
  oos: "OosCase",
  "batch-records": "BatchRecord",
  audits: "Audit",
  suppliers: "Supplier",
  equipment: "Equipment",
  "management-reviews": "ManagementReview",
  complaints: "Complaint",
  training: "TrainingProgram",
  products: "Product",
};

export function RouteIsoReadinessBanner() {
  const pathname = usePathname();
  const match = routeMatch(pathname);
  const readiness = useRecordIsoReadiness(match?.recordType ?? "", match?.recordId ?? "");

  if (!match || readiness.isLoading || readiness.isError || !readiness.data) return null;

  return (
    <div className={`mb-4 rounded-md border px-3 py-2 ${readiness.data.ready ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label font-semibold">ISO Readiness</span>
        <span className={`rounded-md px-2 py-0.5 text-label ${readiness.data.ready ? "bg-success text-white" : "bg-warning/20 text-[#8A6D00]"}`}>
          {readiness.data.ready ? "Ready" : `${readiness.data.blockingMessages.length} blocker(s)`}
        </span>
        <span className="text-label text-muted-foreground">Score {readiness.data.score}%</span>
      </div>
      {!readiness.data.ready && readiness.data.blockingMessages[0] && (
        <p className="mt-1 text-label text-muted-foreground">{readiness.data.blockingMessages[0]}</p>
      )}
    </div>
  );
}

function routeMatch(pathname: string | null) {
  const parts = (pathname ?? "").split("/").filter(Boolean);
  const module = parts[0];
  const id = parts[1];
  if (!module || !id || id === "new" || parts.includes("edit")) return null;
  const recordType = ROUTES[module];
  if (!recordType || !/^\d+$/.test(id)) return null;
  return { recordType, recordId: id };
}
