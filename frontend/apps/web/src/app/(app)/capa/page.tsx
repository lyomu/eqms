"use client";

import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FilePlus2,
  Info,
  ListChecks,
  Search,
  Settings,
  Timer,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useCapaList, useCapaTransition, type CapaAction } from "@/hooks/useCapa";
import { useUsers } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { CapaStatusBadge } from "@/components/capa/CapaStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  CAPA_SOURCE_LABELS,
  CAPA_STATUS_LABELS,
  type CapaResponse,
  type CapaSource,
  type CapaStatus,
} from "@/types/capa";

const ALL_STATUSES = Object.keys(CAPA_STATUS_LABELS) as CapaStatus[];
const ALL_SOURCES = Object.keys(CAPA_SOURCE_LABELS) as CapaSource[];
const OPEN_STATUSES: CapaStatus[] = [
  "DRAFT",
  "UNDER_INVESTIGATION",
  "PENDING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "PENDING_EFFECTIVENESS_CHECK",
];
const ACTION_REQUIRED_STATUSES: CapaStatus[] = [
  "DRAFT",
  "UNDER_INVESTIGATION",
  "PENDING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "PENDING_EFFECTIVENESS_CHECK",
];

type SortKey = "capaNumber" | "title" | "source" | "status" | "owner" | "createdAt" | "dueDate" | "age" | "priority";
type SortDirection = "asc" | "desc";
type QuickView = "open" | "unassigned" | "action" | "mine" | "all";

export default function CapaListPage() {
  const router = useRouter();
  const [quickView, setQuickView] = useState<QuickView>("open");
  const [status, setStatus] = useState<CapaStatus | "">("");
  const [source, setSource] = useState<CapaSource | "">("");
  const [owner, setOwner] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const usersQuery = useUsers();
  const { currentUser } = useAuth();
  const listQuery = useCapaList({ page: 0, size: 250, sort: "createdAt,desc" });
  const transition = useCapaTransition();

  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const allRows = listQuery.data?.content ?? [];
  const myUserId = currentUser?.id ?? null;

  const filteredRows = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00Z`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59Z`).getTime() : null;
    const q = search.trim().toLowerCase();

    return allRows
      .filter((c) => {
        if (quickView === "open" && !OPEN_STATUSES.includes(c.status)) return false;
        if (quickView === "unassigned" && c.assignedTo !== null) return false;
        if (quickView === "action" && !ACTION_REQUIRED_STATUSES.includes(c.status)) return false;
        if (quickView === "mine" && myUserId && c.assignedTo !== myUserId && c.createdBy !== myUserId && c.submittedBy !== myUserId) return false;
        if (status && c.status !== status) return false;
        if (source && c.source !== source) return false;
        if (owner && String(c.assignedTo ?? c.createdBy ?? "") !== owner) return false;

        const created = new Date(c.createdAt).getTime();
        if (from && created < from) return false;
        if (to && created > to) return false;

        if (!q) return true;
        const haystack = [
          c.capaNumber,
          c.title,
          c.description,
          c.rootCause ?? "",
          c.aboutReference ?? "",
          c.aboutDetails ?? "",
          c.partyFirstName ?? "",
          c.partyLastName ?? "",
          c.partyCompany ?? "",
          c.partyEmail ?? "",
          CAPA_SOURCE_LABELS[c.source],
          CAPA_STATUS_LABELS[c.status],
          ownerLabel(c, userName),
          priorityFor(c),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => compareRows(a, b, sortKey, sortDirection, userName));
  }, [allRows, fromDate, myUserId, owner, quickView, search, sortDirection, sortKey, source, status, toDate, userName]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize);
  const openCount = allRows.filter((c) => OPEN_STATUSES.includes(c.status)).length;
  const actionCount = allRows.filter((c) => ACTION_REQUIRED_STATUSES.includes(c.status)).length;
  const unassignedCount = allRows.filter((c) => c.assignedTo === null).length;

  function setFilter(next: () => void) {
    next();
    setPage(0);
  }

  function clearFilters() {
    setStatus("");
    setSource("");
    setOwner("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setQuickView("open");
    setPage(0);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  async function runRowAction(capa: CapaResponse, action: CapaAction, success: string) {
    try {
      await transition.mutateAsync({
        id: capa.id,
        action,
        expectedVersion: capa.version,
        reason: success,
      });
      toast.success(success);
    } catch {
      /* shared API interceptor displays the failure */
    }
  }

  function exportRows(format: "csv" | "excel") {
    const header = ["Number", "About", "Source", "Received", "Assigned", "Age", "Status", "Priority", "Due"];
    const rows = filteredRows.map((c) => [
      c.capaNumber,
      c.title,
      CAPA_SOURCE_LABELS[c.source],
      formatDateTime(c.createdAt),
      ownerLabel(c, userName),
      String(ageInDays(c.createdAt)),
      CAPA_STATUS_LABELS[c.status],
      priorityFor(c),
      formatDate(c.dueDate),
    ]);
    const separator = format === "csv" ? "," : "\t";
    const body = [header, ...rows].map((r) => r.map((cell) => quoteExport(cell, separator)).join(separator)).join("\n");
    const blob = new Blob([body], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capa-worklist.${format === "csv" ? "csv" : "xls"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ownerOptions = usersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">CAPA</h1>
          <p className="mt-1 text-body text-muted-foreground">Corrective and preventive action worklist</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/capa/new">
              <FilePlus2 className="h-4 w-4" />
              New CAPA
            </Link>
          </Button>
          <ToolbarButton active={quickView === "action"} onClick={() => setFilter(() => setQuickView("action"))}>
            <Timer className="h-4 w-4" />
            Action Required
          </ToolbarButton>
          <ToolbarButton active={quickView === "mine"} onClick={() => setFilter(() => setQuickView("mine"))}>
            <Archive className="h-4 w-4" />
            My CAPAs
          </ToolbarButton>
          <ToolbarButton active={quickView === "all"} onClick={() => setFilter(() => setQuickView("all"))}>
            <ClipboardList className="h-4 w-4" />
            All CAPAs
          </ToolbarButton>
          <Button variant="outline" onClick={() => toast.info("CAPA setup controls will be wired in the admin milestone.")}>
            <Settings className="h-4 w-4" />
            Set-Up
          </Button>
          <Button variant="outline" onClick={() => document.getElementById("capa-search")?.focus()}>
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button variant="outline" onClick={() => toast.info("Related-record rollup is planned for the next CAPA pass.")}>
            <Wrench className="h-4 w-4" />
            All RCs
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <QuickPill active={quickView === "open"} onClick={() => setFilter(() => setQuickView("open"))}>
          All Open ({openCount})
        </QuickPill>
        <QuickPill active={quickView === "unassigned"} onClick={() => setFilter(() => setQuickView("unassigned"))}>
          Unassigned ({unassignedCount})
        </QuickPill>
        <QuickPill active={quickView === "action"} onClick={() => setFilter(() => setQuickView("action"))}>
          Action Required ({actionCount})
        </QuickPill>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label="Status" id="f-status">
            <Select id="f-status" value={status} onChange={(e) => setFilter(() => setStatus(e.target.value as CapaStatus | ""))}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CAPA_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Source" id="f-source">
            <Select id="f-source" value={source} onChange={(e) => setFilter(() => setSource(e.target.value as CapaSource | ""))}>
              <option value="">All sources</option>
              {ALL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {CAPA_SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Assigned / Owner" id="f-owner">
            <Select id="f-owner" value={owner} onChange={(e) => setFilter(() => setOwner(e.target.value))}>
              <option value="">All owners</option>
              {ownerOptions.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.fullName}
                </option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Received From" id="f-from">
            <Input id="f-from" type="date" value={fromDate} onChange={(e) => setFilter(() => setFromDate(e.target.value))} />
          </FilterField>
          <FilterField label="Received To" id="f-to">
            <Input id="f-to" type="date" value={toDate} onChange={(e) => setFilter(() => setToDate(e.target.value))} />
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

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <span className="text-label font-semibold text-foreground">Show Entries:</span>
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
              <Label htmlFor="capa-search" className="text-label">
                Search:
              </Label>
              <Input
                id="capa-search"
                value={search}
                onChange={(e) => setFilter(() => setSearch(e.target.value))}
                className="w-64"
                placeholder="Number, title, source, owner..."
              />
            </div>
          </div>
        </div>

        {listQuery.isLoading ? (
          <LoadingScreen label="Loading CAPAs..." />
        ) : listQuery.isError ? (
          <div className="p-4">
            <ErrorAlert title="Error" message="Failed to load CAPAs." />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-body font-semibold">No CAPAs found</p>
            <p className="mt-1 text-label text-muted-foreground">Adjust the filters or create a new CAPA.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                  <SortableHeader label="Number" sortKey="capaNumber" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="About" sortKey="title" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Parties" sortKey="owner" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Received" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Assigned" sortKey="owner" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Age" sortKey="age" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Priority" sortKey="priority" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <th className="px-3 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/35">
                    <td className="px-3 py-3 align-middle">
                      <Link href={`/capa/${c.id}`} className="font-semibold text-brand-primary hover:underline">
                        {c.capaNumber}
                      </Link>
                    </td>
                    <td className="max-w-[300px] px-3 py-3 align-middle">
                      <p className="truncate font-semibold">{c.title}</p>
                      <p className="mt-1 truncate text-label text-muted-foreground">{c.description || "No description"}</p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-col gap-1">
                        <Badge variant="neutral">{CAPA_SOURCE_LABELS[c.source]}</Badge>
                        <span className="text-label text-muted-foreground">{partySummary(c, userName)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDateTime(c.createdAt).replace(" UTC", "")}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        {ownerLabel(c, userName)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-middle">{ageInDays(c.createdAt)}</td>
                    <td className="px-3 py-3 align-middle">
                      <CapaStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <PriorityBadge priority={priorityFor(c)} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex justify-end gap-2">
                        {inlineAction(c, transition.isPending, runRowAction, router.push)}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/capa/${c.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`CAPA information for ${c.capaNumber}`} onClick={() => toast.info(`${c.capaNumber}: ${CAPA_STATUS_LABELS[c.status]}`)}>
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-label font-medium text-muted-foreground">
              Showing {page * pageSize + 1} to {Math.min(page * pageSize + pageSize, filteredRows.length)} of {filteredRows.length} Entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>
                First
              </Button>
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-brand-primary px-3 text-body font-semibold text-white">
                {page + 1}
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ToolbarButton({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className={cn(active && "bg-brand-primary text-white hover:bg-brand-primary/90", className)}
      {...props}
    />
  );
}

function QuickPill({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-4 py-1.5 text-body font-semibold transition-colors",
        active ? "bg-brand-primary text-white shadow-sm" : "text-brand-primary hover:bg-accent",
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

function SortableHeader({ label, sortKey, activeKey, direction, onSort }: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className="px-3 py-3 font-semibold">
      <button type="button" className="inline-flex items-center gap-1 hover:text-brand-primary" onClick={() => onSort(sortKey)}>
        {label}
        <span className="text-xs text-slate-600">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

function inlineAction(
  capa: CapaResponse,
  pending: boolean,
  run: (capa: CapaResponse, action: CapaAction, success: string) => Promise<void>,
  navigate: (href: string) => void
) {
  switch (capa.status) {
    case "DRAFT":
      return (
        <Button size="sm" disabled={pending} onClick={() => run(capa, "submit-for-investigation", "Submitted for investigation")}>
          Submit
        </Button>
      );
    case "UNDER_INVESTIGATION":
      return (
        <Button size="sm" disabled={pending || !capa.rootCause} onClick={() => run(capa, "submit-for-approval", "Submitted for approval")}>
          Submit Approval
        </Button>
      );
    case "APPROVED":
      return (
        <Button size="sm" disabled={pending} onClick={() => run(capa, "start-actions", "Actions started")}>
          Start Actions
        </Button>
      );
    case "IN_PROGRESS":
      return (
        <Button size="sm" disabled={pending} onClick={() => run(capa, "submit-for-effectiveness", "Submitted for effectiveness")}>
          Effectiveness
        </Button>
      );
    case "PENDING_APPROVAL":
    case "PENDING_EFFECTIVENESS_CHECK":
      return (
        <Button size="sm" onClick={() => navigate(`/capa/${capa.id}`)}>
          <CheckCircle2 className="h-4 w-4" />
          Review
        </Button>
      );
    default:
      return null;
  }
}

function ownerLabel(capa: CapaResponse, users: Map<number, string>) {
  if (capa.assignedTo) return users.get(capa.assignedTo) ?? `User #${capa.assignedTo}`;
  if (capa.createdBy) return users.get(capa.createdBy) ?? `User #${capa.createdBy}`;
  return "Unassigned";
}

function nameOf(id: number, users: Map<number, string>) {
  return users.get(id) ?? `User #${id}`;
}

function ageInDays(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function partySummary(capa: CapaResponse, users: Map<number, string>) {
  const fullName = [capa.partyFirstName, capa.partyLastName].filter(Boolean).join(" ").trim();
  if (capa.partyCompany && fullName) return `${capa.partyCompany} - ${fullName}`;
  if (capa.partyCompany) return capa.partyCompany;
  if (fullName) return fullName;
  return capa.submittedBy ? `Submitted by ${nameOf(capa.submittedBy, users)}` : "No party captured";
}

function priorityFor(capa: CapaResponse): "Critical" | "Major" | "Minor" | "Low" | "N/A" {
  if (capa.priority === "CRITICAL") return "Critical";
  if (capa.priority === "MAJOR") return "Major";
  if (capa.priority === "MINOR") return "Minor";
  if (capa.priority === "NA") return "N/A";
  const due = capa.dueDate ? new Date(capa.dueDate).getTime() : null;
  const closed = ["CLOSED", "CANCELLED", "REJECTED"].includes(capa.status);
  if (!closed && due && due < Date.now()) return "Critical";
  if (capa.status === "PENDING_APPROVAL" || capa.status === "PENDING_EFFECTIVENESS_CHECK") return "Major";
  if (capa.status === "IN_PROGRESS" || capa.status === "UNDER_INVESTIGATION") return "Minor";
  return "Low";
}

function PriorityBadge({ priority }: { priority: ReturnType<typeof priorityFor> }) {
  const variant = priority === "Critical" ? "error" : priority === "Major" ? "warning" : priority === "Minor" ? "info" : "neutral";
  return <Badge variant={variant}>{priority}</Badge>;
}

function compareRows(a: CapaResponse, b: CapaResponse, key: SortKey, direction: SortDirection, users: Map<number, string>) {
  const sign = direction === "asc" ? 1 : -1;
  const value = (row: CapaResponse): string | number => {
    switch (key) {
      case "owner":
        return ownerLabel(row, users);
      case "source":
        return CAPA_SOURCE_LABELS[row.source];
      case "status":
        return CAPA_STATUS_LABELS[row.status];
      case "createdAt":
        return new Date(row.createdAt).getTime();
      case "dueDate":
        return row.dueDate ? new Date(row.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      case "age":
        return ageInDays(row.createdAt);
      case "priority":
        return priorityRank(priorityFor(row));
      case "capaNumber":
        return row.capaNumber;
      case "title":
        return row.title;
      default:
        return row.title;
    }
  };
  const av = value(a);
  const bv = value(b);
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
  return String(av).localeCompare(String(bv)) * sign;
}

function priorityRank(priority: ReturnType<typeof priorityFor>) {
  return { Critical: 5, Major: 4, Minor: 3, "N/A": 2, Low: 1 }[priority];
}

function quoteExport(value: string, separator: string) {
  if (separator === "\t") return value.replace(/\t/g, " ");
  return `"${value.replace(/"/g, '""')}"`;
}
