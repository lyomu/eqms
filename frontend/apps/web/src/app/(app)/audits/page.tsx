"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, ChevronDown, ChevronUp, ChevronsUpDown, Filter } from "lucide-react";
import { useAuditList } from "@/hooks/useAudit";
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
  AUDIT_STATUS_LABELS,
  AUDIT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  auditStatusVariant,
  riskLevelVariant,
  ageInDays,
  auditOverdueCheck,
  type AuditResponse,
  type AuditStatus,
  type AuditTypeKey,
  type RiskLevel,
} from "@/types/audit";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANNED_STATUSES: AuditStatus[] = ["DRAFT", "PLANNED", "SCHEDULED"];

const IN_PROGRESS_STATUSES: AuditStatus[] = [
  "IN_PROGRESS",
  "FINDINGS_REVIEW",
  "REPORT_DRAFT",
  "REPORT_SUBMITTED",
  "REPORT_APPROVED",
  "ACTION_PLAN_PENDING",
  "FOLLOW_UP_IN_PROGRESS",
];

const REPORT_PENDING_STATUSES: AuditStatus[] = ["REPORT_DRAFT", "REPORT_SUBMITTED"];

const CLOSED_STATUSES: AuditStatus[] = ["COMPLETED", "CLOSED"];

const RISK_LEVEL_ORDER: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

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

type SortKey = "auditNo" | "auditTitle" | "auditType" | "status" | "department" | "plannedEnd" | "findingsCount" | "riskLevel" | "age";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={cn(
        "cursor-pointer select-none whitespace-nowrap py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

type QuickFilter = "all" | "planned" | "in_progress" | "overdue" | "report_pending" | "closed";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditListPage() {
  const listQuery = useAuditList({ size: 500, sort: "createdAt,desc" });
  const allData: AuditResponse[] = listQuery.data?.content ?? [];

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [filterStatus, setFilterStatus] = useState<AuditStatus | "">("");
  const [filterType, setFilterType] = useState<AuditTypeKey | "">("");
  const [filterRiskLevel, setFilterRiskLevel] = useState<RiskLevel | "">("");
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [filterPendingClosure, setFilterPendingClosure] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("auditNo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const PAGE_SIZE = 15;

  // ─── Summary metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const openFindingsCount = allData.reduce(
      (sum, a) => sum + (a.findings ?? []).filter((f) => f.findingStatus !== "CLOSED").length,
      0
    );
    const majorCriticalCount = allData.reduce(
      (sum, a) =>
        sum +
        (a.findings ?? []).filter(
          (f) =>
            (f.findingType === "MAJOR_NC" || f.findingType === "CRITICAL_NC") &&
            f.findingStatus !== "CLOSED"
        ).length,
      0
    );
    return {
      total: allData.length,
      planned: allData.filter((a) => PLANNED_STATUSES.includes(a.status)).length,
      inProgress: allData.filter((a) => IN_PROGRESS_STATUSES.includes(a.status)).length,
      closed: allData.filter((a) => CLOSED_STATUSES.includes(a.status)).length,
      overdue: allData.filter((a) => auditOverdueCheck(a)).length,
      findingsOpen: openFindingsCount,
      majorCritical: majorCriticalCount,
      reportPending: allData.filter((a) => REPORT_PENDING_STATUSES.includes(a.status)).length,
      pendingClosure: allData.filter((a) => a.status === "PENDING_CLOSURE").length,
      cancelled: allData.filter((a) => a.status === "CANCELLED").length,
    };
  }, [allData]);

  const quickCounts = useMemo(
    () => ({
      all: allData.length,
      planned: metrics.planned,
      in_progress: metrics.inProgress,
      overdue: metrics.overdue,
      report_pending: metrics.reportPending,
      closed: metrics.closed,
    }),
    [allData, metrics]
  );

  // ─── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allData;

    if (quick === "planned") rows = rows.filter((a) => PLANNED_STATUSES.includes(a.status));
    else if (quick === "in_progress") rows = rows.filter((a) => IN_PROGRESS_STATUSES.includes(a.status));
    else if (quick === "overdue") rows = rows.filter((a) => auditOverdueCheck(a));
    else if (quick === "report_pending") rows = rows.filter((a) => REPORT_PENDING_STATUSES.includes(a.status));
    else if (quick === "closed") rows = rows.filter((a) => CLOSED_STATUSES.includes(a.status));

    if (filterStatus) rows = rows.filter((a) => a.status === filterStatus);
    if (filterType) rows = rows.filter((a) => a.auditType === filterType);
    if (filterRiskLevel) rows = rows.filter((a) => a.riskLevel === filterRiskLevel);
    if (filterOverdueOnly) rows = rows.filter((a) => auditOverdueCheck(a));
    if (filterPendingClosure) rows = rows.filter((a) => a.status === "PENDING_CLOSURE");

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) =>
          a.auditNo.toLowerCase().includes(q) ||
          a.auditTitle.toLowerCase().includes(q) ||
          (a.department ?? "").toLowerCase().includes(q) ||
          (a.site ?? "").toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "auditNo":
          cmp = a.auditNo.localeCompare(b.auditNo);
          break;
        case "auditTitle":
          cmp = a.auditTitle.localeCompare(b.auditTitle);
          break;
        case "auditType":
          cmp = a.auditType.localeCompare(b.auditType);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "department":
          cmp = (a.department ?? "").localeCompare(b.department ?? "");
          break;
        case "plannedEnd": {
          const dateA = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : Infinity;
          const dateB = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : Infinity;
          cmp = dateA - dateB;
          break;
        }
        case "findingsCount":
          cmp = (a.findings ?? []).length - (b.findings ?? []).length;
          break;
        case "riskLevel":
          cmp = (RISK_LEVEL_ORDER[a.riskLevel ?? ""] ?? 0) - (RISK_LEVEL_ORDER[b.riskLevel ?? ""] ?? 0);
          break;
        case "age":
          cmp = ageInDays(a.createdAt) - ageInDays(b.createdAt);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allData, quick, filterStatus, filterType, filterRiskLevel, filterOverdueOnly, filterPendingClosure, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function goPage(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  if (listQuery.isLoading) return <LoadingScreen label="Loading audit register…" />;
  if (listQuery.isError) return <ErrorAlert title="Error" message="Failed to load audit register." />;

  return (
    <div className="flex flex-col space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1 text-brand-primary">Audit Management</h1>
        <Button asChild>
          <Link href="/audits/new">
            <Plus className="h-4 w-4 mr-1" />New Audit
          </Link>
        </Button>
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total Audits" value={metrics.total} />
        <SummaryCard label="Planned" value={metrics.planned} />
        <SummaryCard label="In Progress" value={metrics.inProgress} color="text-brand-primary" />
        <SummaryCard label="Completed / Closed" value={metrics.closed} color="text-success" />
        <SummaryCard label="Overdue" value={metrics.overdue} color={metrics.overdue > 0 ? "text-error" : undefined} />
        <SummaryCard label="Findings Open" value={metrics.findingsOpen} color={metrics.findingsOpen > 0 ? "text-error" : undefined} />
        <SummaryCard label="Major / Critical" value={metrics.majorCritical} color={metrics.majorCritical > 0 ? "text-error" : undefined} />
        <SummaryCard label="Report Pending" value={metrics.reportPending} />
        <SummaryCard label="Pending Closure" value={metrics.pendingClosure} />
        <SummaryCard label="Cancelled" value={metrics.cancelled} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label font-semibold transition-colors",
            showFilter
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-border bg-background text-muted-foreground hover:border-brand-primary/50"
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {showFilter ? "Hide Filters" : "Filters"}
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Search</p>
              <Input
                placeholder="Audit no., title, dept, site…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Audit Type</p>
              <Select value={filterType} onChange={(e) => { setFilterType(e.target.value as AuditTypeKey | ""); setPage(1); }}>
                <option value="">All Types</option>
                {(Object.keys(AUDIT_TYPE_LABELS) as AuditTypeKey[]).map((t) => (
                  <option key={t} value={t}>{AUDIT_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as AuditStatus | ""); setPage(1); }}>
                <option value="">All Statuses</option>
                {(Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]).map((s) => (
                  <option key={s} value={s}>{AUDIT_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Risk Level</p>
              <Select value={filterRiskLevel} onChange={(e) => { setFilterRiskLevel(e.target.value as RiskLevel | ""); setPage(1); }}>
                <option value="">All Levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-body hover:bg-accent/30">
                <input
                  type="checkbox"
                  checked={filterOverdueOnly}
                  onChange={() => { setFilterOverdueOnly((v) => !v); setPage(1); }}
                  className="h-4 w-4 accent-brand-primary"
                />
                Overdue only
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-body hover:bg-accent/30">
                <input
                  type="checkbox"
                  checked={filterPendingClosure}
                  onChange={() => { setFilterPendingClosure((v) => !v); setPage(1); }}
                  className="h-4 w-4 accent-brand-primary"
                />
                Pending Closure only
              </label>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterStatus(""); setFilterType(""); setFilterRiskLevel("");
                  setFilterOverdueOnly(false); setFilterPendingClosure(false);
                  setSearch(""); setQuick("all"); setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick pills ── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "planned", "in_progress", "overdue", "report_pending", "closed"] as QuickFilter[]).map((q) => (
          <QuickPill
            key={q}
            label={
              q === "all" ? "All" :
              q === "planned" ? "Planned" :
              q === "in_progress" ? "In Progress" :
              q === "overdue" ? "Overdue" :
              q === "report_pending" ? "Report Pending" :
              "Closed"
            }
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
          <span className="text-label text-muted-foreground">
            {filtered.length} audit{filtered.length !== 1 ? "s" : ""}
          </span>
          <div className="ml-auto">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortableHeader label="Audit No." sortKey="auditNo" current={sortKey} dir={sortDir} onSort={toggleSort} className="pl-4" />
                <SortableHeader label="Audit Title" sortKey="auditTitle" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground">Type</th>
                <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Dept / Site" sortKey="department" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Planned End" sortKey="plannedEnd" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Findings" sortKey="findingsCount" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Risk Level" sortKey="riskLevel" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 text-left text-label uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-body text-muted-foreground">
                    No audits found.
                  </td>
                </tr>
              ) : (
                pageRows.map((a) => {
                  const isExpanded = expandedId === a.id;
                  const isOverdue = auditOverdueCheck(a);
                  const findingsCount = (a.findings ?? []).length;
                  const riskLabel = a.riskLevel
                    ? (RISK_LEVEL_LABELS[a.riskLevel as RiskLevel] ?? a.riskLevel)
                    : null;
                  return [
                    <tr
                      key={a.id}
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="py-2 pl-4 pr-4 font-medium text-brand-primary whitespace-nowrap">
                        <Link
                          href={`/audits/${a.id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="hover:underline"
                        >
                          {a.auditNo}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-[220px] truncate">
                        <Link
                          href={`/audits/${a.id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="hover:underline"
                        >
                          {a.auditTitle.slice(0, 50)}{a.auditTitle.length > 50 ? "…" : ""}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <Badge variant="neutral">
                          {AUDIT_TYPE_LABELS[a.auditType as AuditTypeKey] ?? a.auditType}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={auditStatusVariant(a.status)}>
                          {AUDIT_STATUS_LABELS[a.status] ?? a.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {a.department ?? a.site ?? "—"}
                      </td>
                      <td className={cn("py-2 pr-4 whitespace-nowrap", isOverdue ? "text-error font-medium" : "text-muted-foreground")}>
                        {a.plannedEndDate ? formatDate(a.plannedEndDate) : "—"}
                        {isOverdue && (
                          <span className="ml-1.5">
                            <Badge variant="error">Overdue</Badge>
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span className={findingsCount > 0 ? "font-medium text-warning" : "text-muted-foreground"}>
                          {findingsCount}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {a.riskLevel ? (
                          <Badge variant={riskLevelVariant(a.riskLevel as RiskLevel)}>
                            {riskLabel}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2" onClick={(ev) => ev.stopPropagation()}>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/audits/${a.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${a.id}-detail`} className="bg-muted/20 border-b border-border">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-body sm:grid-cols-2">
                            {a.objective && (
                              <Detail
                                label="Objective"
                                value={a.objective.substring(0, 150) + (a.objective.length > 150 ? "…" : "")}
                              />
                            )}
                            {a.scope && (
                              <Detail
                                label="Scope"
                                value={a.scope.substring(0, 150) + (a.scope.length > 150 ? "…" : "")}
                              />
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/audits/${a.id}`}
                              className="rounded border border-brand-primary px-2 py-1 text-label text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                            >
                              Overview
                            </Link>
                            <Link
                              href={`/audits/${a.id}?tab=checklist`}
                              className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors"
                            >
                              Checklist
                            </Link>
                            <Link
                              href={`/audits/${a.id}?tab=findings`}
                              className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors"
                            >
                              Findings
                            </Link>
                            <Link
                              href={`/audits/${a.id}?tab=trail`}
                              className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors"
                            >
                              Trail
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
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
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
                  p === page
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-border bg-background text-muted-foreground hover:bg-accent/30"
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

// ─── Utility sub-components ───────────────────────────────────────────────────

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
