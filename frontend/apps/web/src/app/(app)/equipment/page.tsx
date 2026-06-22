"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Download, FileSpreadsheet, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useEquipmentList } from "@/hooks/useEquipment";
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
  EQUIPMENT_TYPES,
  equipmentTypeLabel,
  type EquipmentResponse,
  type EquipmentStatus,
  type EquipmentType,
} from "@/types/equipment";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageInDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function calDueVariant(days: number | null): "success" | "warning" | "error" | "neutral" {
  if (days === null) return "neutral";
  if (days < 0) return "error";
  if (days <= 30) return "warning";
  return "success";
}

function calDueLabel(days: number | null): string {
  if (days === null) return "Not scheduled";
  if (days < 0) return `Overdue ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

const STATUS_STYLE: Record<EquipmentStatus, string> = {
  REGISTERED: "bg-muted text-muted-foreground",
  IN_CALIBRATION: "bg-success/15 text-success",
  OUT_OF_CALIBRATION: "bg-error/15 text-error",
  RETIRED: "bg-slate-200 text-slate-600",
};

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  REGISTERED: "Registered",
  IN_CALIBRATION: "In Calibration",
  OUT_OF_CALIBRATION: "Out of Cal.",
  RETIRED: "Retired",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card className="flex-1 min-w-[130px]">
      <CardContent className="p-4 text-center">
        <p className={cn("text-2xl font-bold", color ?? "text-brand-primary")}>{value}</p>
        <p className="mt-0.5 text-label font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}

function QuickPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
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
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
          active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

type SortKey = "code" | "name" | "type" | "location" | "status" | "lastCal" | "nextCal" | "age";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground hover:text-foreground"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

type QuickFilter = "all" | "active" | "out_of_cal" | "due_soon" | "retired";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EquipmentListPage() {
  const { data, isLoading, isError } = useEquipmentList({ size: 500, sort: "createdAt,desc" });
  const all: EquipmentResponse[] = data?.content ?? [];

  const [quick, setQuick] = useState<QuickFilter>("all");
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | "">("");
  const [filterType, setFilterType] = useState<EquipmentType | "">("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // ─── Summary metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const active = all.filter((e) => e.status === "REGISTERED" || e.status === "IN_CALIBRATION").length;
    const inCal = all.filter((e) => e.status === "IN_CALIBRATION").length;
    const overdueCal = all.filter((e) => {
      if (e.status === "RETIRED") return false;
      const d = daysUntil(e.nextCalibrationDate);
      return d !== null && d < 0;
    }).length;
    const dueSoon = all.filter((e) => {
      if (e.status === "RETIRED") return false;
      const d = daysUntil(e.nextCalibrationDate);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    const outOfService = all.filter((e) => e.status === "OUT_OF_CALIBRATION" || e.status === "RETIRED").length;
    const retired = all.filter((e) => e.status === "RETIRED").length;
    return { total: all.length, active, inCal, overdueCal, dueSoon, outOfService, retired };
  }, [all]);

  // ─── Quick pill counts ────────────────────────────────────────────────────
  const quickCounts = useMemo(
    () => ({
      all: all.length,
      active: metrics.active,
      out_of_cal: all.filter((e) => e.status === "OUT_OF_CALIBRATION").length,
      due_soon: all.filter((e) => {
        if (e.status === "RETIRED") return false;
        const d = daysUntil(e.nextCalibrationDate);
        return d !== null && d >= 0 && d <= 30;
      }).length,
      retired: metrics.retired,
    }),
    [all, metrics]
  );

  // ─── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = all;

    if (quick === "active") rows = rows.filter((e) => e.status === "REGISTERED" || e.status === "IN_CALIBRATION");
    else if (quick === "out_of_cal") rows = rows.filter((e) => e.status === "OUT_OF_CALIBRATION");
    else if (quick === "due_soon")
      rows = rows.filter((e) => {
        if (e.status === "RETIRED") return false;
        const d = daysUntil(e.nextCalibrationDate);
        return d !== null && d >= 0 && d <= 30;
      });
    else if (quick === "retired") rows = rows.filter((e) => e.status === "RETIRED");

    if (filterStatus) rows = rows.filter((e) => e.status === filterStatus);
    if (filterType) rows = rows.filter((e) => e.equipmentType === filterType);

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.equipmentCode.toLowerCase().includes(q) ||
          e.equipmentName.toLowerCase().includes(q) ||
          equipmentTypeLabel(e.equipmentType).toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q) ||
          (e.manufacturer ?? "").toLowerCase().includes(q) ||
          (e.model ?? "").toLowerCase().includes(q) ||
          (e.serialNumber ?? "").toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "code": cmp = a.equipmentCode.localeCompare(b.equipmentCode); break;
        case "name": cmp = a.equipmentName.localeCompare(b.equipmentName); break;
        case "type": cmp = equipmentTypeLabel(a.equipmentType).localeCompare(equipmentTypeLabel(b.equipmentType)); break;
        case "location": cmp = (a.location ?? "").localeCompare(b.location ?? ""); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "lastCal": cmp = (a.lastCalibrationDate ?? "").localeCompare(b.lastCalibrationDate ?? ""); break;
        case "nextCal": cmp = (a.nextCalibrationDate ?? "").localeCompare(b.nextCalibrationDate ?? ""); break;
        case "age": cmp = ageInDays(a.createdAt) - ageInDays(b.createdAt); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [all, quick, filterStatus, filterType, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function goPage(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  // ─── Export ──────────────────────────────────────────────────────────────
  function exportCsv() {
    const header = ["Code", "Name", "Type", "Location", "Status", "Manufacturer", "Model", "Serial", "Last Cal", "Next Cal", "Cal Freq (mo)", "Age (days)"];
    const rows = filtered.map((e) => [
      e.equipmentCode, e.equipmentName, equipmentTypeLabel(e.equipmentType), e.location ?? "",
      e.status, e.manufacturer ?? "", e.model ?? "", e.serialNumber ?? "",
      formatDate(e.lastCalibrationDate), formatDate(e.nextCalibrationDate),
      e.calibrationFrequencyMonths ?? "", ageInDays(e.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "equipment.csv";
    a.click();
  }

  function exportExcel() {
    const header = ["Code", "Name", "Type", "Location", "Status", "Manufacturer", "Model", "Serial", "Last Cal", "Next Cal", "Cal Freq", "Age (days)"];
    const rows = filtered.map((e) => [
      e.equipmentCode, e.equipmentName, equipmentTypeLabel(e.equipmentType), e.location ?? "",
      e.status, e.manufacturer ?? "", e.model ?? "", e.serialNumber ?? "",
      formatDate(e.lastCalibrationDate), formatDate(e.nextCalibrationDate),
      e.calibrationFrequencyMonths ?? "", ageInDays(e.createdAt),
    ]);
    const tsv = [header, ...rows].map((r) => r.join("\t")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([tsv], { type: "application/vnd.ms-excel" }));
    a.download = "equipment.xls";
    a.click();
  }

  if (isLoading) return <LoadingScreen label="Loading equipment…" />;
  if (isError) return <ErrorAlert title="Error" message="Failed to load equipment list." />;

  return (
    <div className="flex flex-col space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href="/equipment/new">
            <Plus className="h-4 w-4" /> New Equipment
          </Link>
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
        <SummaryCard label="Active" value={metrics.active} color="text-success" />
        <SummaryCard label="In Calibration" value={metrics.inCal} color="text-brand-primary" />
        <SummaryCard
          label="Overdue Cal."
          value={metrics.overdueCal}
          color={metrics.overdueCal > 0 ? "text-error" : undefined}
        />
        <SummaryCard
          label="Due ≤ 30d"
          value={metrics.dueSoon}
          color={metrics.dueSoon > 0 ? "text-warning" : undefined}
        />
        <SummaryCard
          label="Out of Service"
          value={metrics.outOfService}
          color={metrics.outOfService > 0 ? "text-error" : undefined}
        />
      </div>

      {/* ── Filter panel ── */}
      {showFilter && (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
              <Select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as EquipmentStatus | ""); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="REGISTERED">Registered</option>
                <option value="IN_CALIBRATION">In Calibration</option>
                <option value="OUT_OF_CALIBRATION">Out of Calibration</option>
                <option value="RETIRED">Retired</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Equipment Type</p>
              <Select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as EquipmentType | ""); setPage(1); }}
              >
                <option value="">All Types</option>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{equipmentTypeLabel(t)}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setFilterStatus(""); setFilterType(""); setSearch(""); setQuick("all"); setPage(1); }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick pills ── */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "out_of_cal", "due_soon", "retired"] as QuickFilter[]).map((q) => (
          <QuickPill
            key={q}
            label={
              q === "all" ? "All" :
              q === "active" ? "Active" :
              q === "out_of_cal" ? "Out of Cal." :
              q === "due_soon" ? "Due for Cal." :
              "Retired"
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
          <Select
            value={String(pageSize)}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="w-20"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <span className="text-label text-muted-foreground">entries</span>
          <button
            onClick={exportCsv}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-label hover:bg-accent/30"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-label hover:bg-accent/30"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortableHeader label="Code" sortKey="code" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Name" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Type" sortKey="type" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Location" sortKey="location" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Last Cal." sortKey="lastCal" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Next Cal." sortKey="nextCal" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="whitespace-nowrap py-2 pr-4 text-left text-label uppercase tracking-wide text-muted-foreground">Cal. Due</th>
                <SortableHeader label="Age" sortKey="age" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="py-2 text-left text-label uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-body text-muted-foreground">
                    No equipment found.
                  </td>
                </tr>
              ) : (
                pageRows.map((e) => {
                  const age = ageInDays(e.createdAt);
                  const days = daysUntil(e.nextCalibrationDate);
                  const isExpanded = expandedId === e.id;
                  return [
                    <tr
                      key={e.id}
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/20 transition-colors"
                    >
                      <td className="py-2 pr-4 font-medium text-brand-primary">
                        <Link
                          href={`/equipment/${e.id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="hover:underline"
                        >
                          {e.equipmentCode}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{e.equipmentName}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{equipmentTypeLabel(e.equipmentType)}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{e.location ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-label font-semibold",
                            STATUS_STYLE[e.status]
                          )}
                        >
                          {STATUS_LABEL[e.status]}
                        </span>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDate(e.lastCalibrationDate)}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDate(e.nextCalibrationDate)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={calDueVariant(days)}>{calDueLabel(days)}</Badge>
                      </td>
                      <td
                        className={cn(
                          "py-2 pr-4 font-medium",
                          age > 730 ? "text-error" : age > 365 ? "text-warning" : ""
                        )}
                      >
                        {age}d
                      </td>
                      <td className="py-2">
                        <Link
                          href={`/equipment/${e.id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className="text-brand-primary text-label hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${e.id}-detail`} className="bg-muted/20 border-b border-border">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-body sm:grid-cols-4">
                            <Detail label="Manufacturer" value={e.manufacturer} />
                            <Detail label="Model" value={e.model} />
                            <Detail label="Serial No." value={e.serialNumber} />
                            <Detail
                              label="Cal. Frequency"
                              value={e.calibrationFrequencyMonths ? `${e.calibrationFrequencyMonths} months` : null}
                            />
                            <Detail label="Calibrations" value={`${e.calibrationHistory.length} record(s)`} />
                            <Detail label="Maintenance" value={`${e.maintenanceHistory.length} record(s)`} />
                            <Detail label="Specifications" value={`${e.specifications.length} defined`} />
                            <Detail label="Acquired" value={formatDate(e.acquisitionDate)} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              href={`/equipment/${e.id}`}
                              className="rounded border border-brand-primary px-2 py-1 text-label text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                            >
                              Overview
                            </Link>
                            <Link
                              href={`/equipment/${e.id}?tab=calibration`}
                              className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors"
                            >
                              Calibration
                            </Link>
                            <Link
                              href={`/equipment/${e.id}?tab=maintenance`}
                              className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors"
                            >
                              Maintenance
                            </Link>
                            <Link
                              href={`/equipment/${e.id}?tab=specs`}
                              className="rounded border border-border px-2 py-1 text-label text-muted-foreground hover:bg-accent/30 transition-colors"
                            >
                              Specifications
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
            Showing{" "}
            {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}{" "}
            of {filtered.length} entries
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

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-label text-muted-foreground">{label}: </span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}

function PaginationBtn({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
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
