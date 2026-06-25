"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Download, FileSpreadsheet, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useRiskList } from "@/hooks/useRisk";
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
  CATEGORY_LABELS,
  RISK_STATUS_LABELS,
  RISK_STATUS_CLASSES,
  riskScoreClass,
  type RiskCategory,
  type RiskResponse,
  type RiskStatus,
} from "@/types/risk";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageInDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function riskLevel(score: number | null | undefined): { label: string; cls: string } {
  if (!score) return { label: "Not Assessed", cls: "bg-muted text-muted-foreground" };
  if (score >= 17) return { label: "Critical", cls: "bg-error text-white" };
  if (score >= 10) return { label: "High", cls: "bg-error/15 text-error" };
  if (score >= 5) return { label: "Medium", cls: "bg-warning/20 text-[#8A6D00]" };
  return { label: "Low", cls: "bg-success/15 text-success" };
}

const OPEN_STATUSES: RiskStatus[] = ["IDENTIFIED", "ANALYZED", "MITIGATED"];

// ─── Sub-components ───────────────────────────────────────────────────────────

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

type SortKey = "riskNo" | "title" | "category" | "score" | "status" | "age";
type SortDir = "asc" | "desc";

function SortableHeader({ label, sortKey, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void }) {
  const active = current === sortKey;
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground hover:text-foreground"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

type QuickFilter = "all" | "open" | "high_critical" | "accepted" | "closed";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RiskListPage() {
  const { data, isLoading, isError } = useRiskList({ size: 500, sort: "createdAt,desc" });
  const all: RiskResponse[] = data?.content ?? [];

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [filterStatus, setFilterStatus] = useState<RiskStatus | "">("");
  const [filterCategory, setFilterCategory] = useState<RiskCategory | "">("");
  const [filterLevel, setFilterLevel] = useState<"low" | "medium" | "high" | "critical" | "">("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("riskNo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // ─── Summary metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => ({
    total: all.length,
    open: all.filter((r) => OPEN_STATUSES.includes(r.status)).length,
    highCritical: all.filter((r) => (r.riskScore ?? 0) >= 10).length,
    pendingAssessment: all.filter((r) => r.status === "IDENTIFIED").length,
    accepted: all.filter((r) => r.status === "ACCEPTED").length,
    closed: all.filter((r) => r.status === "CLOSED" || r.status === "CANCELLED").length,
  }), [all]);

  const quickCounts = useMemo(() => ({
    all: all.length,
    open: metrics.open,
    high_critical: metrics.highCritical,
    accepted: metrics.accepted,
    closed: metrics.closed,
  }), [all, metrics]);

  // ─── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = all;

    if (quick === "open") rows = rows.filter((r) => OPEN_STATUSES.includes(r.status));
    else if (quick === "high_critical") rows = rows.filter((r) => (r.riskScore ?? 0) >= 10);
    else if (quick === "accepted") rows = rows.filter((r) => r.status === "ACCEPTED");
    else if (quick === "closed") rows = rows.filter((r) => r.status === "CLOSED" || r.status === "CANCELLED");

    if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
    if (filterCategory) rows = rows.filter((r) => r.category === filterCategory);
    if (filterLevel) {
      rows = rows.filter((r) => {
        const s = r.riskScore ?? 0;
        if (filterLevel === "critical") return s >= 17;
        if (filterLevel === "high") return s >= 10 && s < 17;
        if (filterLevel === "medium") return s >= 5 && s < 10;
        if (filterLevel === "low") return s > 0 && s < 5;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.riskNo.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          CATEGORY_LABELS[r.category].toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "riskNo": cmp = a.riskNo.localeCompare(b.riskNo); break;
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "score": cmp = (a.riskScore ?? 0) - (b.riskScore ?? 0); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "age": cmp = ageInDays(a.createdAt) - ageInDays(b.createdAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [all, quick, filterStatus, filterCategory, filterLevel, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  // ─── Export ──────────────────────────────────────────────────────────────
  function exportCsv() {
    const header = ["Risk No.", "Title", "Category", "Score", "Level", "Status", "Accepted", "Closed", "Age (days)"];
    const rows = filtered.map((r) => [
      r.riskNo, r.title, CATEGORY_LABELS[r.category], r.riskScore ?? "",
      riskLevel(r.riskScore).label, RISK_STATUS_LABELS[r.status],
      formatDate(r.acceptedDate), formatDate(r.closedDate), ageInDays(r.createdAt),
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "risks.csv";
    a.click();
  }

  function exportExcel() {
    const header = ["Risk No.", "Title", "Category", "Score", "Level", "Status", "Age (days)"];
    const rows = filtered.map((r) => [
      r.riskNo, r.title, CATEGORY_LABELS[r.category], r.riskScore ?? "",
      riskLevel(r.riskScore).label, RISK_STATUS_LABELS[r.status], ageInDays(r.createdAt),
    ]);
    const tsv = [header, ...rows].map((r) => r.join("\t")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([tsv], { type: "application/vnd.ms-excel" }));
    a.download = "risks.xls";
    a.click();
  }

  if (isLoading) return <LoadingScreen label="Loading risk register…" />;
  if (isError) return <ErrorAlert title="Error" message="Failed to load risk register." />;

  return (
    <div className="flex flex-col space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href="/risks/new"><Plus className="h-4 w-4" /> New Risk</Link>
        </Button>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={cn(
            "rounded-full border px-3 py-1 text-label font-semibold transition-colors",
            showFilter
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-border bg-background text-muted-foreground hover:border-brand-primary/50"
          )}
        >
          {showFilter ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total Risks" value={metrics.total} />
        <SummaryCard label="Open" value={metrics.open} color="text-brand-primary" />
        <SummaryCard label="High / Critical" value={metrics.highCritical} color={metrics.highCritical > 0 ? "text-error" : undefined} />
        <SummaryCard label="Pending Assessment" value={metrics.pendingAssessment} color={metrics.pendingAssessment > 0 ? "text-warning" : undefined} />
        <SummaryCard label="Accepted" value={metrics.accepted} color="text-success" />
        <SummaryCard label="Closed" value={metrics.closed} />
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as RiskStatus | ""); setPage(1); }}>
                <option value="">All Statuses</option>
                {(Object.keys(RISK_STATUS_LABELS) as RiskStatus[]).map((s) => (
                  <option key={s} value={s}>{RISK_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <Select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value as RiskCategory | ""); setPage(1); }}>
                <option value="">All Categories</option>
                {(Object.keys(CATEGORY_LABELS) as RiskCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Risk Level</p>
              <Select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value as typeof filterLevel); setPage(1); }}>
                <option value="">All Levels</option>
                <option value="critical">Critical (17–25)</option>
                <option value="high">High (10–16)</option>
                <option value="medium">Medium (5–9)</option>
                <option value="low">Low (1–4)</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setFilterStatus(""); setFilterCategory(""); setFilterLevel(""); setSearch(""); setQuick("all"); setPage(1); }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick pills ── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "high_critical", "accepted", "closed"] as QuickFilter[]).map((q) => (
          <QuickPill
            key={q}
            label={q === "all" ? "All" : q === "open" ? "Open" : q === "high_critical" ? "High & Critical" : q === "accepted" ? "Accepted" : "Closed"}
            count={quickCounts[q]}
            active={quick === q}
            onClick={() => { setQuick(q); setPage(1); }}
          />
        ))}
      </div>

      {/* ── Table card ── */}
      <Card>
        {/* Table toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-label text-muted-foreground">Show</span>
          <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="w-20">
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <span className="text-label text-muted-foreground">entries</span>
          <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-label hover:bg-accent/30">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={exportExcel} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-label hover:bg-accent/30">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <Input placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-48" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-muted/30 [&>th:first-child]:pl-4">
                <SortableHeader label="Risk No." sortKey="riskNo" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Title" sortKey="title" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Score" sortKey="score" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground">Level</th>
                <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Age" sortKey="age" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 text-left text-label uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-body text-muted-foreground">No risks found.</td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const age = ageInDays(r.createdAt);
                  const level = riskLevel(r.riskScore);
                  const isExpanded = expandedId === r.id;
                  return [
                    <tr
                      key={r.id}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="py-2 pl-4 pr-4 font-medium text-brand-primary">
                        <Link href={`/risks/${r.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:underline">
                          {r.riskNo}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-[220px] truncate">{r.title}</td>
                      <td className="py-2 pr-4">{CATEGORY_LABELS[r.category]}</td>
                      <td className="py-2 pr-4">
                        <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium", riskScoreClass(r.riskScore))}>
                          {r.riskScore ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-label font-semibold", level.cls)}>
                          {level.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-label font-semibold", RISK_STATUS_CLASSES[r.status])}>
                          {RISK_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className={cn("py-2 pr-4 font-medium", age > 365 ? "text-error" : age > 180 ? "text-warning" : "")}>
                        {age}d
                      </td>
                      <td className="py-2">
                        <Link href={`/risks/${r.id}`} onClick={(ev) => ev.stopPropagation()} className="text-brand-primary text-label hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${r.id}-detail`} className="bg-muted/20 border-b border-border">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-body sm:grid-cols-2">
                            <Detail label="Description" value={r.description.substring(0, 200) + (r.description.length > 200 ? "…" : "")} />
                            <Detail label="Potential Impact" value={r.potentialImpact.substring(0, 200) + (r.potentialImpact.length > 200 ? "…" : "")} />
                            {r.analysis && (
                              <>
                                <Detail label="Analysis Method" value={r.analysis.analysisMethod} />
                                <Detail label="Severity / Probability" value={`${r.analysis.severity ?? "—"} × ${r.analysis.probability ?? "—"}`} />
                              </>
                            )}
                            <Detail label="Controls" value={`${r.mitigations.length} defined`} />
                            <Detail label="Effectiveness Checks" value={`${r.effectivenessChecks.length} recorded`} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={`/risks/${r.id}`} className="rounded border border-brand-primary px-2 py-1 text-label text-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
                              Overview
                            </Link>
                            <Link href={`/risks/${r.id}?tab=assessment`} className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors">
                              Assessment
                            </Link>
                            <Link href={`/risks/${r.id}?tab=controls`} className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors">
                              Controls
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <p className="text-label text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1">
            <PaginationBtn label="First" disabled={page === 1} onClick={() => goPage(1)} />
            <PaginationBtn label="Prev" disabled={page === 1} onClick={() => goPage(page - 1)} />
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            }).map((p) => (
              <button
                key={p}
                onClick={() => goPage(p)}
                className={cn(
                  "min-w-[28px] rounded border px-2 py-1 text-label",
                  p === page ? "border-brand-primary bg-brand-primary text-white" : "border-border bg-background text-muted-foreground hover:bg-accent/30"
                )}
              >
                {p}
              </button>
            ))}
            <PaginationBtn label="Next" disabled={page === totalPages} onClick={() => goPage(page + 1)} />
            <PaginationBtn label="Last" disabled={page === totalPages} onClick={() => goPage(totalPages)} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-label text-muted-foreground">{label}: </span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

function PaginationBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 disabled:pointer-events-none disabled:opacity-40"
    >
      {label}
    </button>
  );
}
