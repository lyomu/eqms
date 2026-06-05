/** Mirrors the backend Reporting contract (com.eqms.reports). Reports require AUDIT_VIEW. */

export interface ReportData {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface ReportDef {
  slug: string; // GET /api/reports/{slug}
  type: string; // ReportType enum for /export
  title: string;
  description: string;
}

/** Reports available today (ReportType: DOCUMENTS, CHANGES, DEVIATIONS, CAPA). */
export const REPORTS: ReportDef[] = [
  { slug: "documents", type: "DOCUMENTS", title: "Document Report", description: "All controlled documents by status, owner and dates." },
  { slug: "changes", type: "CHANGES", title: "Change Log", description: "Change requests, their type and lifecycle state." },
  { slug: "deviations", type: "DEVIATIONS", title: "Deviation Summary", description: "Deviations by severity and status." },
  { slug: "capa", type: "CAPA", title: "CAPA Status", description: "CAPAs by source and status." },
];

export const REPORT_BY_SLUG: Record<string, ReportDef> = Object.fromEntries(REPORTS.map((r) => [r.slug, r]));
