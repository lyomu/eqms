"use client";

import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FilePlus2,
  Search,
  Settings,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useNonConformanceList } from "@/hooks/useNonConformances";
import { useUsers } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  NC_STATUS_LABELS,
  NC_TYPE_LABELS,
  type NcStatus,
  type NcType,
  type NonConformanceResponse,
} from "@/types/nonconformance";

const OPEN_STATUSES: NcStatus[] = ["OPEN", "INVESTIGATING"];
const IMPORTANCE_MAP: Record<NcType, { label: string; variant: "error" | "warning" | "neutral" }> = {
  PRODUCT: { label: "Critical", variant: "error" },
  MATERIAL: { label: "Major", variant: "warning" },
  PROCESS: { label: "Minor", variant: "neutral" },
};

type SortKey = "ncNo" | "about" | "importance" | "logged" | "assigned" | "age" | "status";
type SortDir = "asc" | "desc";
type QuickView = "open" | "unassigned" | "action" | "mine" | "all";

export default function NonConformancesPage() {
  const router = useRouter();
  const [quickView, setQuickView] = useState<QuickView>("open");
  const [aboutFilter, setAboutFilter] = useState<NcType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("logged");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const usersQuery = useUsers();
  const { currentUser } = useAuth();
  const listQuery = useNonConformanceList({ page: 0, size: 250, sort: "createdAt,desc" });

  const userNameMap = useMemo(() => {
    const m = new Map<number, string>();
    usersQuery.data?.forEach((u) => m.set(u.id, u.fullName));
    return m;
  }, [usersQuery.data]);

  const allRows = listQuery.data?.content ?? [];
  const myUserId = currentUser?.id ?? null;

  const filteredRows = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00Z`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59Z`).getTime() : null;
    const q = search.trim().toLowerCase();

    return allRows
      .filter((nc) => {
        const isOpen = OPEN_STATUSES.includes(nc.status);
        if (quickView === "open" && !isOpen) return false;
        if (quickView === "unassigned" && nc.ownerId !== null) return false;
        if (quickView === "action" && !isOpen) return false;
        if (quickView === "mine" && myUserId && nc.ownerId !== myUserId && nc.createdBy !== myUserId) return false;

        if (aboutFilter && nc.ncType !== aboutFilter) return false;

        const logged = new Date(nc.discoveredDate ?? nc.createdAt).getTime();
        if (from && logged < from) return false;
        if (to && logged > to) return false;

        if (!q) return true;
        const hay = [
          nc.ncNo,
          nc.title,
          nc.description,
          NC_TYPE_LABELS[nc.ncType],
          IMPORTANCE_MAP[nc.ncType].label,
          NC_STATUS_LABELS[nc.status],
          nc.ownerId ? (userNameMap.get(nc.ownerId) ?? "") : "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => compareNcRows(a, b, sortKey, sortDir, userNameMap));
  }, [allRows, fromDate, toDate, search, quickView, aboutFilter, myUserId, sortKey, sortDir, userNameMap]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize);

  const openCount = allRows.filter((nc) => OPEN_STATUSES.includes(nc.status)).length;
  const unassignedCount = allRows.filter((nc) => nc.ownerId === null).length;

  function setFilter(fn: () => void) {
    fn();
    setPage(0);
  }

  function clearFilters() {
    setAboutFilter("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setQuickView("open");
    setPage(0);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportRows(format: "csv" | "excel") {
    const header = ["Number", "About", "Importance", "Logged", "Assigned", "Age", "Status"];
    const rows = filteredRows.map((nc) => [
      nc.ncNo,
      NC_TYPE_LABELS[nc.ncType],
      IMPORTANCE_MAP[nc.ncType].label,
      formatDate(nc.discoveredDate ?? nc.createdAt),
      nc.ownerId ? (userNameMap.get(nc.ownerId) ?? `User #${nc.ownerId}`) : "Unassigned",
      String(ageInDays(nc.createdAt)),
      NC_STATUS_LABELS[nc.status],
    ]);
    const sep = format === "csv" ? "," : "\t";
    const body = [header, ...rows]
      .map((r) => r.map((c) => (sep === "\t" ? c.replace(/\t/g, " ") : `"${c.replace(/"/g, '""')}"`)).join(sep))
      .join("\n");
    const blob = new Blob([body], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `non-conformances.${format === "csv" ? "csv" : "xls"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* ── Title + toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/">Go Back</Link>
        </Button>
        <Button asChild size="sm" className="bg-destructive text-white hover:bg-destructive/90">
          <Link href="/non-conformances/new">
            <FilePlus2 className="h-4 w-4" />
            New Non-Conformance
          </Link>
        </Button>
        <ToolbarButton
          active={quickView === "action"}
          onClick={() => setFilter(() => setQuickView("action"))}
        >
          <AlertCircle className="h-4 w-4" />
          Action Required
        </ToolbarButton>
        <ToolbarButton
          active={quickView === "mine"}
          onClick={() => setFilter(() => setQuickView("mine"))}
        >
          <UserRound className="h-4 w-4" />
          My Non-Conformance
        </ToolbarButton>
        <ToolbarButton
          active={quickView === "all"}
          onClick={() => setFilter(() => setQuickView("all"))}
        >
          <Eye className="h-4 w-4" />
          All Non-Conformance
        </ToolbarButton>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
          Set-Up
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("nc-search")?.focus()}
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* ── Quick-view pills ── */}
      <div className="flex flex-wrap items-center gap-3">
        <QuickPill
          active={quickView === "open"}
          onClick={() => setFilter(() => setQuickView("open"))}
        >
          All Open ({openCount})
        </QuickPill>
        <QuickPill
          active={quickView === "unassigned"}
          onClick={() => setFilter(() => setQuickView("unassigned"))}
        >
          Unassigned ({unassignedCount})
        </QuickPill>
      </div>

      {/* ── Filter panel ── */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FilterField label="About" id="f-about">
            <Select
              id="f-about"
              value={aboutFilter}
              onChange={(e) => setFilter(() => setAboutFilter(e.target.value as NcType | ""))}
            >
              <option value="">All</option>
              {Object.entries(NC_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Date From" id="f-date-from">
            <div className="flex items-center gap-1">
              <Input
                id="f-date-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFilter(() => setFromDate(e.target.value))}
              />
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </FilterField>
          <FilterField label="Date To" id="f-date-to">
            <div className="flex items-center gap-1">
              <Input
                id="f-date-to"
                type="date"
                value={toDate}
                onChange={(e) => setFilter(() => setToDate(e.target.value))}
              />
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </FilterField>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => setPage(0)}>
            <Search className="h-4 w-4" />
            Find
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <span className="text-label font-semibold">Show Entries:</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="w-24"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => exportRows("csv")}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportRows("excel")}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <div className="flex items-center gap-2">
              <Label htmlFor="nc-search" className="text-label">
                Search:
              </Label>
              <Input
                id="nc-search"
                value={search}
                onChange={(e) => setFilter(() => setSearch(e.target.value))}
                className="w-64"
                placeholder="Number, type, status..."
              />
            </div>
          </div>
        </div>

        {listQuery.isLoading ? (
          <LoadingScreen label="Loading non-conformances..." />
        ) : listQuery.isError ? (
          <div className="p-4">
            <ErrorAlert title="Error" message="Failed to load non-conformances." />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-body font-semibold">No non-conformances found</p>
            <p className="mt-1 text-label text-muted-foreground">
              Adjust the filters or create a new NC.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                  <SortableHeader label="Number" sortKey="ncNo" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableHeader label="About" sortKey="about" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Importance" sortKey="importance" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Logged" sortKey="logged" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Assigned" sortKey="assigned" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Age" sortKey="age" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th className="px-3 py-3 font-semibold">Details</th>
                  <th className="px-3 py-3 font-semibold">Next Task Due</th>
                  <th className="px-3 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((nc) => {
                  const expanded = expandedId === nc.id;
                  const ownerName = nc.ownerId
                    ? (userNameMap.get(nc.ownerId) ?? `User #${nc.ownerId}`)
                    : "Unassigned";
                  const loggedStr = formatDate(nc.discoveredDate ?? nc.createdAt);
                  const age = ageInDays(nc.createdAt);
                  const imp = IMPORTANCE_MAP[nc.ncType];
                  return (
                    <tr key={nc.id} className="border-b border-border last:border-0 hover:bg-accent/35">
                      <td className="px-3 py-3 align-middle">
                        <Link
                          href={`/non-conformances/${nc.id}`}
                          className="font-semibold text-brand-primary hover:underline"
                        >
                          {nc.ncNo}
                        </Link>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="font-medium">{NC_TYPE_LABELS[nc.ncType]}</span>
                        {nc.affectedItemType && (
                          <span className="ml-1 text-muted-foreground">({nc.affectedItemType})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Badge variant={imp.variant}>{imp.label}</Badge>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="whitespace-nowrap">{loggedStr}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {ownerName}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle font-medium">{age}</td>
                      <td className="px-3 py-3 align-middle">
                        <NcStatusBadge status={nc.status} />
                      </td>
                      <td className="max-w-[200px] px-3 py-3 align-top">
                        <button
                          type="button"
                          className="mb-1 text-label font-semibold text-brand-primary hover:underline"
                          onClick={() => setExpandedId(expanded ? null : nc.id)}
                        >
                          {expanded ? "…Show less" : "…Read more"}
                        </button>
                        <p className={cn("text-label text-muted-foreground", !expanded && "line-clamp-3")}>
                          {nc.description}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle text-muted-foreground">—</td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/non-conformances/${nc.id}`}>
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Action required"
                            onClick={() => router.push(`/non-conformances/${nc.id}`)}
                          >
                            <TriangleAlert className="h-4 w-4 text-warning" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-label font-medium text-muted-foreground">
              Showing {page * pageSize + 1} to{" "}
              {Math.min(page * pageSize + pageSize, filteredRows.length)} of{" "}
              {filteredRows.length} Entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-brand-primary px-3 text-body font-semibold text-white">
                {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage(totalPages - 1)}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToolbarButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn(active && "bg-brand-primary text-white hover:bg-brand-primary/90", className)}
      {...props}
    />
  );
}

function QuickPill({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-4 py-1.5 text-body font-semibold transition-colors",
        active
          ? "bg-destructive text-white shadow-sm"
          : "text-brand-primary hover:bg-accent",
        className
      )}
      {...props}
    />
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className="px-3 py-3 font-semibold">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-brand-primary"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <span className="text-xs text-slate-500">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

function NcStatusBadge({ status }: { status: NcStatus }) {
  const map: Record<NcStatus, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    INVESTIGATING: "bg-amber-100 text-amber-800",
    DISPOSITION_APPROVED: "bg-purple-100 text-purple-800",
    ACTION_IMPLEMENTED: "bg-teal-100 text-teal-800",
    CLOSED: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        map[status] ?? "bg-muted text-foreground"
      )}
    >
      {NC_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageInDays(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function compareNcRows(
  a: NonConformanceResponse,
  b: NonConformanceResponse,
  key: SortKey,
  direction: SortDir,
  users: Map<number, string>
) {
  const sign = direction === "asc" ? 1 : -1;
  const val = (nc: NonConformanceResponse): string | number => {
    switch (key) {
      case "ncNo": return nc.ncNo;
      case "about": return NC_TYPE_LABELS[nc.ncType];
      case "importance": {
        const rank: Record<NcType, number> = { PRODUCT: 3, MATERIAL: 2, PROCESS: 1 };
        return rank[nc.ncType] ?? 0;
      }
      case "logged": return new Date(nc.discoveredDate ?? nc.createdAt).getTime();
      case "assigned": return nc.ownerId ? (users.get(nc.ownerId) ?? "") : "";
      case "age": return ageInDays(nc.createdAt);
      case "status": return NC_STATUS_LABELS[nc.status];
      default: return nc.ncNo;
    }
  };
  const av = val(a);
  const bv = val(b);
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
  return String(av).localeCompare(String(bv)) * sign;
}
