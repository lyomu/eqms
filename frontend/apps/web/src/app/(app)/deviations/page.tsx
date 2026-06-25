"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Download, FileSpreadsheet, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useDeviationList } from "@/hooks/useDeviation";
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
  STATUS_LABELS,
  CATEGORY_LABELS,
  RISK_LEVEL_LABELS,
  DEVIATION_TYPE_LABELS,
  deviationStatusVariant,
  deviationSeverityVariant,
  deviationRiskVariant,
  ageInDays,
  daysUntil,
  type DeviationResponse,
  type DeviationStatus,
  type DeviationSeverity,
  type DeviationCategory,
  type DeviationRiskLevel,
} from "@/types/deviation";

// ─── Constants ────────────────────────────────────────────────────────────────

const OPEN_STATUSES: DeviationStatus[] = [
  "DRAFT",
  "REPORTED",
  "UNDER_INVESTIGATION",
  "INVESTIGATION_IN_PROGRESS",
  "REOPENED",
];

const INVESTIGATION_STATUSES: DeviationStatus[] = [
  "UNDER_INVESTIGATION",
  "INVESTIGATION_IN_PROGRESS",
];

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

type SortKey = "devNo" | "title" | "category" | "department" | "severity" | "riskLevel" | "status" | "invDue" | "age";
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

type QuickFilter = "all" | "open" | "critical_major" | "pending_approval" | "closed" | "overdue";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeviationListPage() {
  const { data, isLoading, isError } = useDeviationList({ size: 500, sort: "createdAt,desc" });
  const all: DeviationResponse[] = data?.content ?? [];

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [filterStatus, setFilterStatus] = useState<DeviationStatus | "">("");
  const [filterSeverity, setFilterSeverity] = useState<DeviationSeverity | "">("");
  const [filterCategory, setFilterCategory] = useState<DeviationCategory | "">("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterRiskLevel, setFilterRiskLevel] = useState<DeviationRiskLevel | "">("");
  const [filterCapaRequired, setFilterCapaRequired] = useState(false);
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("devNo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // ─── Summary metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = Date.now();
    return {
      total: all.length,
      open: all.filter((d) => OPEN_STATUSES.includes(d.status)).length,
      criticalMajor: all.filter((d) => d.severity === "CRITICAL" || d.severity === "MAJOR").length,
      pendingQaScreening: all.filter((d) => d.status === "REPORTED").length,
      investigationInProgress: all.filter((d) => INVESTIGATION_STATUSES.includes(d.status)).length,
      overdueInvestigation: all.filter((d) => {
        if (!OPEN_STATUSES.includes(d.status)) return false;
        if (!d.targetInvestigationDueDate) return false;
        return new Date(d.targetInvestigationDueDate).getTime() < now;
      }).length,
      pendingApproval: all.filter((d) => d.status === "PENDING_APPROVAL").length,
      capaRequired: all.filter((d) => d.capaRequired && OPEN_STATUSES.includes(d.status)).length,
      closed: all.filter((d) => d.status === "CLOSED").length,
      productOrBatchAffected: all.filter((d) => d.productAffected || d.batchAffected).length,
    };
  }, [all]);

  const quickCounts = useMemo(() => {
    const now = Date.now();
    return {
      all: all.length,
      open: metrics.open,
      critical_major: metrics.criticalMajor,
      pending_approval: metrics.pendingApproval,
      closed: metrics.closed,
      overdue: all.filter((d) => {
        if (!OPEN_STATUSES.includes(d.status)) return false;
        if (!d.targetInvestigationDueDate) return false;
        return new Date(d.targetInvestigationDueDate).getTime() < now;
      }).length,
    };
  }, [all, metrics]);

  // ─── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now();
    let rows = all;

    if (quick === "open") rows = rows.filter((d) => OPEN_STATUSES.includes(d.status));
    else if (quick === "critical_major") rows = rows.filter((d) => d.severity === "CRITICAL" || d.severity === "MAJOR");
    else if (quick === "pending_approval") rows = rows.filter((d) => d.status === "PENDING_APPROVAL");
    else if (quick === "closed") rows = rows.filter((d) => d.status === "CLOSED");
    else if (quick === "overdue") rows = rows.filter((d) => {
      if (!OPEN_STATUSES.includes(d.status)) return false;
      if (!d.targetInvestigationDueDate) return false;
      return new Date(d.targetInvestigationDueDate).getTime() < now;
    });

    if (filterStatus) rows = rows.filter((d) => d.status === filterStatus);
    if (filterSeverity) rows = rows.filter((d) => d.severity === filterSeverity);
    if (filterCategory) rows = rows.filter((d) => d.category === filterCategory);
    if (filterDepartment.trim()) rows = rows.filter((d) => (d.department ?? "").toLowerCase().includes(filterDepartment.toLowerCase()));
    if (filterRiskLevel) rows = rows.filter((d) => d.initialRiskLevel === filterRiskLevel || d.finalRiskLevel === filterRiskLevel);
    if (filterCapaRequired) rows = rows.filter((d) => d.capaRequired);
    if (filterOverdueOnly) rows = rows.filter((d) => {
      if (!OPEN_STATUSES.includes(d.status) || !d.targetInvestigationDueDate) return false;
      return new Date(d.targetInvestigationDueDate).getTime() < now;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.deviationNumber.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          (d.department ?? "").toLowerCase().includes(q) ||
          (d.category ? CATEGORY_LABELS[d.category].toLowerCase().includes(q) : false) ||
          d.description.toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "devNo": cmp = a.deviationNumber.localeCompare(b.deviationNumber); break;
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "category": cmp = (a.category ?? "").localeCompare(b.category ?? ""); break;
        case "department": cmp = (a.department ?? "").localeCompare(b.department ?? ""); break;
        case "severity": cmp = a.severity.localeCompare(b.severity); break;
        case "riskLevel": cmp = (a.initialRiskLevel ?? "").localeCompare(b.initialRiskLevel ?? ""); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "invDue": cmp = (a.targetInvestigationDueDate ?? "").localeCompare(b.targetInvestigationDueDate ?? ""); break;
        case "age": cmp = ageInDays(a.createdAt) - ageInDays(b.createdAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [all, quick, filterStatus, filterSeverity, filterCategory, filterDepartment, filterRiskLevel, filterCapaRequired, filterOverdueOnly, search, sortKey, sortDir]);

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
    const header = ["Dev No.", "Title", "Type", "Category", "Department", "Severity", "Risk Level", "Status", "Investigation Due", "CAPA Required", "Age (days)"];
    const rows = filtered.map((d) => [
      d.deviationNumber, d.title,
      d.deviationType ? DEVIATION_TYPE_LABELS[d.deviationType] : "",
      d.category ? CATEGORY_LABELS[d.category] : "",
      d.department ?? "",
      d.severity,
      d.initialRiskLevel ? RISK_LEVEL_LABELS[d.initialRiskLevel] : "",
      STATUS_LABELS[d.status],
      formatDate(d.targetInvestigationDueDate),
      d.capaRequired ? "Yes" : "No",
      ageInDays(d.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "deviations.csv";
    a.click();
  }

  function exportExcel() {
    const header = ["Dev No.", "Title", "Category", "Department", "Severity", "Status", "Age (days)"];
    const rows = filtered.map((d) => [
      d.deviationNumber, d.title,
      d.category ? CATEGORY_LABELS[d.category] : "",
      d.department ?? "", d.severity, STATUS_LABELS[d.status], ageInDays(d.createdAt),
    ]);
    const tsv = [header, ...rows].map((r) => r.join("\t")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([tsv], { type: "application/vnd.ms-excel" }));
    a.download = "deviations.xls";
    a.click();
  }

  if (isLoading) return <LoadingScreen label="Loading deviation register…" />;
  if (isError) return <ErrorAlert title="Error" message="Failed to load deviation register." />;

  return (
    <div className="flex flex-col space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href="/deviations/new"><Plus className="h-4 w-4" /> New Deviation</Link>
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
        <SummaryCard label="Total" value={metrics.total} />
        <SummaryCard label="Open" value={metrics.open} color="text-brand-primary" />
        <SummaryCard label="Critical / Major" value={metrics.criticalMajor} color={metrics.criticalMajor > 0 ? "text-error" : undefined} />
        <SummaryCard label="Pending QA Screening" value={metrics.pendingQaScreening} color={metrics.pendingQaScreening > 0 ? "text-warning" : undefined} />
        <SummaryCard label="Investigation In Progress" value={metrics.investigationInProgress} color="text-brand-primary" />
        <SummaryCard label="Overdue Investigation" value={metrics.overdueInvestigation} color={metrics.overdueInvestigation > 0 ? "text-error" : undefined} />
        <SummaryCard label="Pending Approval" value={metrics.pendingApproval} color={metrics.pendingApproval > 0 ? "text-warning" : undefined} />
        <SummaryCard label="CAPA Required" value={metrics.capaRequired} color={metrics.capaRequired > 0 ? "text-warning" : undefined} />
        <SummaryCard label="Closed" value={metrics.closed} color="text-success" />
        <SummaryCard label="Product / Batch Affected" value={metrics.productOrBatchAffected} color={metrics.productOrBatchAffected > 0 ? "text-error" : undefined} />
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as DeviationStatus | ""); setPage(1); }}>
                <option value="">All Statuses</option>
                {(Object.keys(STATUS_LABELS) as DeviationStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Severity</p>
              <Select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value as DeviationSeverity | ""); setPage(1); }}>
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <Select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value as DeviationCategory | ""); setPage(1); }}>
                <option value="">All Categories</option>
                {(Object.keys(CATEGORY_LABELS) as DeviationCategory[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Department</p>
              <Input placeholder="Filter by department…" value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Risk Level</p>
              <Select value={filterRiskLevel} onChange={(e) => { setFilterRiskLevel(e.target.value as DeviationRiskLevel | ""); setPage(1); }}>
                <option value="">All Levels</option>
                {(Object.keys(RISK_LEVEL_LABELS) as DeviationRiskLevel[]).map((l) => (
                  <option key={l} value={l}>{RISK_LEVEL_LABELS[l]}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-body hover:bg-accent/30">
                <input type="checkbox" checked={filterCapaRequired} onChange={() => { setFilterCapaRequired((v) => !v); setPage(1); }} className="h-4 w-4 accent-brand-primary" />
                CAPA Required only
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-body hover:bg-accent/30">
                <input type="checkbox" checked={filterOverdueOnly} onChange={() => { setFilterOverdueOnly((v) => !v); setPage(1); }} className="h-4 w-4 accent-brand-primary" />
                Overdue investigations only
              </label>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => {
                setFilterStatus(""); setFilterSeverity(""); setFilterCategory(""); setFilterDepartment("");
                setFilterRiskLevel(""); setFilterCapaRequired(false); setFilterOverdueOnly(false);
                setSearch(""); setQuick("all"); setPage(1);
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick pills ── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "critical_major", "pending_approval", "closed", "overdue"] as QuickFilter[]).map((q) => (
          <QuickPill
            key={q}
            label={
              q === "all" ? "All" :
              q === "open" ? "Open" :
              q === "critical_major" ? "Critical / Major" :
              q === "pending_approval" ? "Pending Approval" :
              q === "closed" ? "Closed" :
              "Overdue"
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
              <tr className="border-b border-border bg-muted/30 [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                <SortableHeader label="Dev No." sortKey="devNo" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Title" sortKey="title" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground">Type</th>
                <SortableHeader label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Department" sortKey="department" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Severity" sortKey="severity" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Inv. Due" sortKey="invDue" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Age" sortKey="age" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 text-left text-label uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-body text-muted-foreground">No deviations found.</td>
                </tr>
              ) : (
                pageRows.map((d) => {
                  const age = ageInDays(d.createdAt);
                  const invDays = daysUntil(d.targetInvestigationDueDate);
                  const isExpanded = expandedId === d.id;
                  return [
                    <tr
                      key={d.id}
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="py-2 pl-4 pr-4 font-medium text-brand-primary whitespace-nowrap">
                        <Link href={`/deviations/${d.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:underline">
                          {d.deviationNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{d.title.slice(0, 45)}{d.title.length > 45 ? "…" : ""}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {d.deviationType ? (
                          <Badge variant={d.deviationType === "UNPLANNED" ? "warning" : "neutral"}>
                            {DEVIATION_TYPE_LABELS[d.deviationType]}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{d.category ? CATEGORY_LABELS[d.category] : "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{d.department ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={deviationSeverityVariant(d.severity)}>{d.severity}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={deviationStatusVariant(d.status)}>{STATUS_LABELS[d.status]}</Badge>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {d.targetInvestigationDueDate ? (
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">{formatDate(d.targetInvestigationDueDate)}</span>
                            {invDays !== null && invDays < 0 && OPEN_STATUSES.includes(d.status) && (
                              <Badge variant="error">Overdue</Badge>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className={cn("py-2 pr-4 font-medium whitespace-nowrap", age > 180 ? "text-error" : age > 90 ? "text-warning" : "")}>
                        {age}d
                      </td>
                      <td className="py-2">
                        <Link href={`/deviations/${d.id}`} onClick={(ev) => ev.stopPropagation()} className="text-brand-primary text-label hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${d.id}-detail`} className="bg-muted/20 border-b border-border">
                        <td colSpan={11} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-body sm:grid-cols-2">
                            <Detail label="Description" value={d.description.substring(0, 100) + (d.description.length > 100 ? "…" : "")} />
                            {d.immediateAction && <Detail label="Immediate Action" value={d.immediateAction.substring(0, 100) + (d.immediateAction.length > 100 ? "…" : "")} />}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {d.productAffected && <Badge variant="warning">Product Affected</Badge>}
                            {d.materialAffected && <Badge variant="warning">Material Affected</Badge>}
                            {d.batchAffected && <Badge variant="error">Batch Affected</Badge>}
                            {d.equipmentAffected && <Badge variant="warning">Equipment Affected</Badge>}
                            {d.supplierInvolved && <Badge variant="neutral">Supplier Involved</Badge>}
                            {d.capaRequired && <Badge variant="warning">CAPA Required</Badge>}
                            {d.containmentRequired && <Badge variant="error">Containment Required</Badge>}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={`/deviations/${d.id}`} className="rounded border border-brand-primary px-2 py-1 text-label text-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
                              Overview
                            </Link>
                            <Link href={`/deviations/${d.id}?tab=containment`} className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors">
                              Containment
                            </Link>
                            <Link href={`/deviations/${d.id}?tab=investigation`} className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors">
                              Investigation
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
