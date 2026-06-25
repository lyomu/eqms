"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Filter } from "lucide-react";
import { useOosList } from "@/hooks/useOos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  OOS_STATUS_LABELS,
  OOS_STATUS_VARIANT,
  OOS_RECORD_TYPE_LABELS,
  OOS_SEVERITY_LABELS,
  OOS_SEVERITY_VARIANT,
  type OosCaseResponse,
  type OosStatus,
  type OosRecordType,
  type OosSeverity,
} from "@/types/oos";

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card className="flex-1 min-w-[130px]">
      <CardContent className="p-4 text-center">
        <p className={cn("text-2xl font-bold", color ?? "text-brand-primary")}>{value}</p>
        <p className="mt-0.5 text-label font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Quick pill ───────────────────────────────────────────────────────────────

function QuickPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-label font-semibold transition-colors",
        active
          ? "border-brand-primary bg-brand-primary text-white"
          : "border-border bg-background text-muted-foreground hover:border-brand-primary/50"
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
        {count}
      </span>
    </button>
  );
}

// ─── Severity badge helper ─────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="text-muted-foreground">—</span>;
  const variant = OOS_SEVERITY_VARIANT[severity as OosSeverity] ?? "neutral";
  const label = OOS_SEVERITY_LABELS[severity as OosSeverity] ?? severity;
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variant = OOS_STATUS_VARIANT[status as OosStatus] ?? "neutral";
  const label = OOS_STATUS_LABELS[status as OosStatus] ?? status;
  return <Badge variant={variant}>{label}</Badge>;
}

type QuickFilter = "all" | "active" | "qa_review" | "retest" | "disposition" | "closed";

const QUICK_FILTER_STATUSES: Record<QuickFilter, OosStatus[]> = {
  all: [],
  active: ["REPORTED", "INITIAL_ASSESSMENT", "AWAITING_REPEAT", "INVESTIGATING", "LAB_INVESTIGATION", "REOPENED"],
  qa_review: ["QA_REVIEW"],
  retest: ["RETEST_PENDING", "RESAMPLE_PENDING"],
  disposition: ["DISPOSITION_PENDING", "DISPOSITION_DETERMINED"],
  closed: ["CLOSED", "CANCELLED"],
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OosListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [recordType, setRecordType] = useState<OosRecordType | "">("");
  const [severity, setSeverity] = useState<OosSeverity | "">("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useOosList({ page, size: 20, sort: "createdAt,desc" });

  const allCases = data?.content ?? [];

  // Client-side filtering on the loaded page
  const filtered = useMemo(() => {
    let rows = allCases;
    const statuses = QUICK_FILTER_STATUSES[quickFilter];
    if (statuses.length > 0) rows = rows.filter((o) => statuses.includes(o.status as OosStatus));
    if (recordType) rows = rows.filter((o) => o.recordType === recordType);
    if (severity) rows = rows.filter((o) => o.severity === severity);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (o) =>
          o.oosNo.toLowerCase().includes(q) ||
          (o.title ?? "").toLowerCase().includes(q) ||
          (o.testMethod ?? "").toLowerCase().includes(q) ||
          (o.batchId ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allCases, quickFilter, recordType, severity, search]);

  // Summary counts
  const counts = useMemo(() => ({
    total: allCases.length,
    active: allCases.filter((o) => QUICK_FILTER_STATUSES.active.includes(o.status as OosStatus)).length,
    qaReview: allCases.filter((o) => o.status === "QA_REVIEW").length,
    retest: allCases.filter((o) => QUICK_FILTER_STATUSES.retest.includes(o.status as OosStatus)).length,
    disposition: allCases.filter((o) => QUICK_FILTER_STATUSES.disposition.includes(o.status as OosStatus)).length,
    closed: allCases.filter((o) => QUICK_FILTER_STATUSES.closed.includes(o.status as OosStatus)).length,
  }), [allCases]);

  if (isLoading) return <LoadingScreen label="Loading OOS register…" />;
  if (isError) return <ErrorAlert title="Failed to load" message="Unable to load OOS cases. Please try again." />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">OOS / OOT Register</h1>
          <p className="text-body text-muted-foreground">Out-of-specification and out-of-trend investigation records</p>
        </div>
        <Button className="ml-auto" onClick={() => router.push("/oos/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Report OOS / OOT
        </Button>
      </div>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total" value={counts.total} />
        <SummaryCard label="Active" value={counts.active} color="text-warning" />
        <SummaryCard label="QA Review" value={counts.qaReview} color="text-info" />
        <SummaryCard label="Retest / Resample" value={counts.retest} color="text-warning" />
        <SummaryCard label="Disposition" value={counts.disposition} color="text-info" />
        <SummaryCard label="Closed" value={counts.closed} color="text-success" />
      </div>

      {/* Quick pills */}
      <div className="flex flex-wrap gap-2">
        <QuickPill label="All" count={counts.total} active={quickFilter === "all"} onClick={() => setQuickFilter("all")} />
        <QuickPill label="Active" count={counts.active} active={quickFilter === "active"} onClick={() => setQuickFilter("active")} />
        <QuickPill label="QA Review" count={counts.qaReview} active={quickFilter === "qa_review"} onClick={() => setQuickFilter("qa_review")} />
        <QuickPill label="Retest / Resample" count={counts.retest} active={quickFilter === "retest"} onClick={() => setQuickFilter("retest")} />
        <QuickPill label="Disposition Pending" count={counts.disposition} active={quickFilter === "disposition"} onClick={() => setQuickFilter("disposition")} />
        <QuickPill label="Closed" count={counts.closed} active={quickFilter === "closed"} onClick={() => setQuickFilter("closed")} />
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="Search by OOS No., title, test method, batch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-label text-muted-foreground">Record Type</label>
              <Select value={recordType} onChange={(e) => setRecordType(e.target.value as OosRecordType | "")}>
                <option value="">All types</option>
                {(Object.keys(OOS_RECORD_TYPE_LABELS) as OosRecordType[]).map((k) => (
                  <option key={k} value={k}>{OOS_RECORD_TYPE_LABELS[k]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-label text-muted-foreground">Severity</label>
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as OosSeverity | "")}>
                <option value="">All severities</option>
                {(Object.keys(OOS_SEVERITY_LABELS) as OosSeverity[]).map((k) => (
                  <option key={k} value={k}>{OOS_SEVERITY_LABELS[k]}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-label text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">OOS No.</th>
                  <th className="px-4 py-3 font-semibold">Title / Test</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Severity</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Reported</th>
                  <th className="px-4 py-3 font-semibold hidden xl:table-cell">Due Date</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No OOS cases match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <OosRow key={o.id} oos={o} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between text-label text-muted-foreground">
          <span>Page {page + 1} of {data?.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1) - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function OosRow({ oos }: { oos: OosCaseResponse }) {
  const isOverdue = oos.dueDate && new Date(oos.dueDate) < new Date() && !["CLOSED", "CANCELLED"].includes(oos.status);
  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer">
      <td className="px-4 py-3">
        <Link href={`/oos/${oos.id}`} className="font-medium text-brand-secondary hover:underline">
          {oos.oosNo}
        </Link>
      </td>
      <td className="px-4 py-3 max-w-[240px]">
        <p className="font-medium truncate">{oos.title ?? oos.testName ?? oos.testMethod ?? "—"}</p>
        {oos.reportedResult && (
          <p className="text-label text-error font-medium">Result: {oos.reportedResult}</p>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-label">
        {oos.recordType ? (OOS_RECORD_TYPE_LABELS[oos.recordType as OosRecordType] ?? oos.recordType) : "—"}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <SeverityBadge severity={oos.severity} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={oos.status} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-label text-muted-foreground">
        {formatDate(oos.reportedDate)}
      </td>
      <td className="px-4 py-3 hidden xl:table-cell text-label">
        {oos.dueDate ? (
          <span className={cn(isOverdue ? "text-error font-semibold" : "text-muted-foreground")}>
            {formatDate(oos.dueDate)}
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/oos/${oos.id}`}>View</Link>
        </Button>
      </td>
    </tr>
  );
}
