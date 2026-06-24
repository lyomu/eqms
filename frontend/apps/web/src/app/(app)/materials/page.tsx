"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Filter, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useMaterialList } from "@/hooks/useMaterial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import {
  MATERIAL_STATUS_LABELS,
  MATERIAL_TYPE_LABELS,
  STORAGE_CONDITION_LABELS,
  materialStatusVariant,
  materialCriticalityVariant,
  type MaterialResponse,
  type MaterialStatus,
  type MaterialType,
  type StorageCondition,
} from "@/types/material";

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

type SortKey = "materialCode" | "name" | "materialType" | "status" | "category" | "criticality" | "storageCondition" | "age";
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
        {active
          ? dir === "asc"
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

type QuickFilter = "all" | "active" | "draft_pending" | "critical" | "on_hold";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaterialListPage() {
  const { data, isLoading, isError } = useMaterialList({ size: 500, sort: "createdAt,desc" });
  const allData: MaterialResponse[] = data?.content ?? [];

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MaterialType | "">("");
  const [filterStatus, setFilterStatus] = useState<MaterialStatus | "">("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCriticality, setFilterCriticality] = useState("");
  const [filterStorage, setFilterStorage] = useState<StorageCondition | "">("");
  const [filterQcRequired, setFilterQcRequired] = useState(false);
  const [filterCoaRequired, setFilterCoaRequired] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [sortKey, setSortKey] = useState<SortKey>("materialCode");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ─── Summary metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => ({
    total: allData.length,
    active: allData.filter((m) => m.status === "APPROVED").length,
    critical: allData.filter((m) => m.criticality === "CRITICAL").length,
    draftOrPending: allData.filter((m) => m.status === "DRAFT" || m.status === "PENDING_APPROVAL").length,
    onHold: allData.filter((m) => m.status === "ON_HOLD").length,
    obsolete: allData.filter((m) => m.status === "OBSOLETE").length,
    qcRequired: allData.filter((m) => m.qcTestingRequired).length,
    quarantineOnReceipt: allData.filter((m) => m.quarantineRequiredOnReceipt).length,
    coaRequired: allData.filter((m) => m.coaRequired).length,
    approvedSupplierRequired: allData.filter((m) => m.approvedSupplierRequired).length,
  }), [allData]);

  const quickCounts = useMemo(() => ({
    all: allData.length,
    active: metrics.active,
    draft_pending: metrics.draftOrPending,
    critical: metrics.critical,
    on_hold: metrics.onHold,
  }), [allData.length, metrics]);

  // ─── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allData;

    if (quick === "active") rows = rows.filter((m) => m.status === "APPROVED");
    else if (quick === "draft_pending") rows = rows.filter((m) => m.status === "DRAFT" || m.status === "PENDING_APPROVAL");
    else if (quick === "critical") rows = rows.filter((m) => m.criticality === "CRITICAL");
    else if (quick === "on_hold") rows = rows.filter((m) => m.status === "ON_HOLD");

    if (filterType) rows = rows.filter((m) => m.materialType === filterType);
    if (filterStatus) rows = rows.filter((m) => m.status === filterStatus);
    if (filterCategory) rows = rows.filter((m) => (m.category ?? "") === filterCategory);
    if (filterCriticality) rows = rows.filter((m) => (m.criticality ?? "") === filterCriticality);
    if (filterStorage) rows = rows.filter((m) => (m.standardStorageCondition ?? "") === filterStorage);
    if (filterQcRequired) rows = rows.filter((m) => m.qcTestingRequired);
    if (filterCoaRequired) rows = rows.filter((m) => m.coaRequired);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (m) =>
          m.materialCode.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q) ||
          (m.casNumber ?? "").toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "materialCode": cmp = a.materialCode.localeCompare(b.materialCode); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "materialType": cmp = a.materialType.localeCompare(b.materialType); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "category": cmp = (a.category ?? "").localeCompare(b.category ?? ""); break;
        case "criticality": cmp = (a.criticality ?? "").localeCompare(b.criticality ?? ""); break;
        case "storageCondition": cmp = (a.standardStorageCondition ?? "").localeCompare(b.standardStorageCondition ?? ""); break;
        case "age": {
          const aAge = Date.now() - new Date(a.createdAt).getTime();
          const bAge = Date.now() - new Date(b.createdAt).getTime();
          cmp = aAge - bAge;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allData, quick, filterType, filterStatus, filterCategory, filterCriticality, filterStorage, filterQcRequired, filterCoaRequired, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  function goPage(p: number) { setPage(Math.min(Math.max(1, p), totalPages)); }

  function ageInDays(createdAt: string) {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  }

  function categoryVariant(cat: string | null): "error" | "warning" | "neutral" {
    if (cat === "CRITICAL") return "error";
    if (cat === "MAJOR") return "warning";
    return "neutral";
  }

  if (isLoading) return <LoadingScreen label="Loading materials register…" />;
  if (isError) return <ErrorAlert title="Error" message="Failed to load materials register." />;

  return (
    <div className="flex flex-col space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1 text-brand-primary">Materials Management</h1>
        <Button asChild>
          <Link href="/materials/new"><Plus className="h-4 w-4 mr-1" />New Material</Link>
        </Button>
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
          {showFilter ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total Materials" value={metrics.total} />
        <SummaryCard label="Active" value={metrics.active} color="text-success" />
        <SummaryCard label="Critical Materials" value={metrics.critical} color={metrics.critical > 0 ? "text-error" : undefined} />
        <SummaryCard label="Draft / Pending" value={metrics.draftOrPending} color="text-brand-primary" />
        <SummaryCard label="On Hold" value={metrics.onHold} color={metrics.onHold > 0 ? "text-[#8A6D00]" : undefined} />
        <SummaryCard label="Obsolete" value={metrics.obsolete} color="text-muted-foreground" />
        <SummaryCard label="QC Required" value={metrics.qcRequired} color={metrics.qcRequired > 0 ? "text-brand-primary" : undefined} />
        <SummaryCard label="Quarantine on Receipt" value={metrics.quarantineOnReceipt} color={metrics.quarantineOnReceipt > 0 ? "text-warning" : undefined} />
        <SummaryCard label="COA Required" value={metrics.coaRequired} color={metrics.coaRequired > 0 ? "text-brand-primary" : undefined} />
        <SummaryCard label="Approved Supplier Req." value={metrics.approvedSupplierRequired} color={metrics.approvedSupplierRequired > 0 ? "text-brand-primary" : undefined} />
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Search</p>
              <Input placeholder="Name, code, CAS…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Material Type</p>
              <Select value={filterType} onChange={(e) => { setFilterType(e.target.value as MaterialType | ""); setPage(1); }}>
                <option value="">All Types</option>
                {(Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]).map((t) => (
                  <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as MaterialStatus | ""); setPage(1); }}>
                <option value="">All Statuses</option>
                {(Object.keys(MATERIAL_STATUS_LABELS) as MaterialStatus[]).map((s) => (
                  <option key={s} value={s}>{MATERIAL_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
              <Select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Criticality</p>
              <Select value={filterCriticality} onChange={(e) => { setFilterCriticality(e.target.value); setPage(1); }}>
                <option value="">All Criticalities</option>
                <option value="CRITICAL">Critical</option>
                <option value="NON_CRITICAL">Non-Critical</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Storage Condition</p>
              <Select value={filterStorage} onChange={(e) => { setFilterStorage(e.target.value as StorageCondition | ""); setPage(1); }}>
                <option value="">All Conditions</option>
                {(Object.keys(STORAGE_CONDITION_LABELS) as StorageCondition[]).map((sc) => (
                  <option key={sc} value={sc}>{STORAGE_CONDITION_LABELS[sc]}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-body hover:bg-accent/30">
                <input type="checkbox" checked={filterQcRequired} onChange={() => { setFilterQcRequired((v) => !v); setPage(1); }} className="h-4 w-4 accent-brand-primary" />
                QC Testing Required only
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-body hover:bg-accent/30">
                <input type="checkbox" checked={filterCoaRequired} onChange={() => { setFilterCoaRequired((v) => !v); setPage(1); }} className="h-4 w-4 accent-brand-primary" />
                COA Required only
              </label>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => {
                setFilterType(""); setFilterStatus(""); setFilterCategory(""); setFilterCriticality("");
                setFilterStorage(""); setFilterQcRequired(false); setFilterCoaRequired(false);
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
        {(["all", "active", "draft_pending", "critical", "on_hold"] as QuickFilter[]).map((q) => (
          <QuickPill
            key={q}
            label={
              q === "all" ? "All" :
              q === "active" ? "Active" :
              q === "draft_pending" ? "Draft / Pending" :
              q === "critical" ? "Critical" :
              "On Hold"
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
          <span className="text-label text-muted-foreground">{filtered.length} material{filtered.length !== 1 ? "s" : ""}</span>
          <Input placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="ml-auto w-48" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-muted/30 [&>th:first-child]:pl-4 [&>th:last-child]:pr-4">
                <SortableHeader label="Material Code" sortKey="materialCode" current={sortKey} dir={sortDir} onSort={toggleSort} className="pl-4" />
                <SortableHeader label="Material Name" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground whitespace-nowrap">Type</th>
                <SortableHeader label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Criticality" sortKey="criticality" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Storage" sortKey="storageCondition" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground whitespace-nowrap">QA Controls</th>
                <th className="py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-body text-muted-foreground">No materials found.</td>
                </tr>
              ) : (
                pageRows.map((m) => {
                  const age = ageInDays(m.createdAt);
                  const isExpanded = expandedId === m.id;
                  return [
                    <tr
                      key={m.id}
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="py-2 pl-4 pr-4 font-medium text-brand-primary whitespace-nowrap">
                        <Link href={`/materials/${m.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:underline">
                          {m.materialCode}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-[200px]">
                        <Link href={`/materials/${m.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:underline block truncate">
                          {m.name.length > 40 ? m.name.slice(0, 40) + "…" : m.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <Badge variant="neutral">{MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType}</Badge>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {m.category ? (
                          <Badge variant={categoryVariant(m.category)}>{m.category}</Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {m.criticality ? (
                          <Badge variant={materialCriticalityVariant(m.criticality)}>
                            {m.criticality === "NON_CRITICAL" ? "Non-Critical" : m.criticality}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground text-label whitespace-nowrap">
                        {m.standardStorageCondition
                          ? (STORAGE_CONDITION_LABELS[m.standardStorageCondition as StorageCondition] ?? m.standardStorageCondition)
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <Badge variant={materialStatusVariant(m.status)}>{MATERIAL_STATUS_LABELS[m.status] ?? m.status}</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {m.qcTestingRequired && (
                            <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-primary uppercase tracking-wide">QC</span>
                          )}
                          {m.coaRequired && (
                            <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] font-bold text-info uppercase tracking-wide">COA</span>
                          )}
                          {m.approvedSupplierRequired && (
                            <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-[#8A6D00] uppercase tracking-wide">AS</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <Link href={`/materials/${m.id}`} onClick={(ev) => ev.stopPropagation()} className="text-brand-primary text-label hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${m.id}-detail`} className="bg-muted/20 border-b border-border">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-body sm:grid-cols-2 lg:grid-cols-3">
                            {m.description && (
                              <Detail label="Description" value={m.description.substring(0, 120) + (m.description.length > 120 ? "…" : "")} />
                            )}
                            {m.intendedUse && (
                              <Detail label="Intended Use" value={m.intendedUse.substring(0, 120) + (m.intendedUse.length > 120 ? "…" : "")} />
                            )}
                            {m.specificationReference && (
                              <Detail label="Specification Ref." value={m.specificationReference} />
                            )}
                            {m.casNumber && (
                              <Detail label="CAS Number" value={m.casNumber} />
                            )}
                            {m.grade && (
                              <Detail label="Grade" value={m.grade} />
                            )}
                            <Detail label="Age" value={`${age} day${age !== 1 ? "s" : ""}`} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.quarantineRequiredOnReceipt && <Badge variant="warning">Quarantine on Receipt</Badge>}
                            {m.qaReleaseRequiredBeforeUse && <Badge variant="info">QA Release Before Use</Badge>}
                            {m.samplingRequired && <Badge variant="neutral">Sampling Required</Badge>}
                            {m.sdsRequired && <Badge variant="neutral">SDS Required</Badge>}
                            {m.expiryDateRequired && <Badge variant="neutral">Expiry Date Required</Badge>}
                            {m.retestDateRequired && <Badge variant="neutral">Retest Date Required</Badge>}
                            {m.riskAssessmentRequired && <Badge variant="warning">Risk Assessment Required</Badge>}
                            {m.fefoRequired && <Badge variant="neutral">FEFO</Badge>}
                            {m.fifoRequired && <Badge variant="neutral">FIFO</Badge>}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href={`/materials/${m.id}`} className="rounded border border-brand-primary px-2 py-1 text-label text-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
                              Overview
                            </Link>
                            <Link href={`/materials/${m.id}?tab=lots`} className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors">
                              Lots
                            </Link>
                            <Link href={`/materials/${m.id}?tab=ledger`} className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors">
                              Ledger
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
