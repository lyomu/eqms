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
  Search,
  Settings,
  Timer,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useChangeAction, useChangeList, type ChangeAction } from "@/hooks/useChangeControl";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useDocuments";
import { ChangeStatusBadge } from "@/components/change-control/ChangeStatusBadge";
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
import { CHANGE_STATUS_LABELS, type ChangeControlResponse, type ChangeStatus, type ChangeTypeKey } from "@/types/change-control";

const ALL_STATUSES = Object.keys(CHANGE_STATUS_LABELS) as ChangeStatus[];
const ALL_TYPES: ChangeTypeKey[] = ["MAJOR", "MINOR"];
const OPEN_STATUSES: ChangeStatus[] = ["DRAFT", "UNDER_REVIEW", "CHANGES_REQUESTED", "PENDING_APPROVAL", "APPROVED", "IN_IMPLEMENTATION", "IMPLEMENTED", "PENDING_CLOSURE"];
const ACTION_REQUIRED_STATUSES: ChangeStatus[] = ["DRAFT", "UNDER_REVIEW", "PENDING_APPROVAL", "APPROVED", "IN_IMPLEMENTATION", "IMPLEMENTED", "PENDING_CLOSURE"];

type SortKey = "changeNumber" | "title" | "type" | "status" | "owner" | "createdAt" | "targetImplementationDate" | "age" | "priority";
type SortDirection = "asc" | "desc";
type QuickView = "open" | "unassigned" | "action" | "mine" | "all";

export default function ChangeControlListPage() {
  const router = useRouter();
  const [quickView, setQuickView] = useState<QuickView>("open");
  const [status, setStatus] = useState<ChangeStatus | "">("");
  const [type, setType] = useState<ChangeTypeKey | "">("");
  const [owner, setOwner] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { currentUser } = useAuth();
  const usersQuery = useUsers();
  const listQuery = useChangeList({ page: 0, size: 250, sort: "createdAt,desc" });
  const action = useChangeAction();

  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const allRows = listQuery.data?.content ?? [];
  const myUserId = currentUser?.id ?? null;

  const ownerOptions = useMemo(() => {
    const values = new Set<string>();
    allRows.forEach((row) => {
      if (row.changeOwner) values.add(row.changeOwner);
      if (row.qaResponsible) values.add(row.qaResponsible);
      if (row.createdBy) values.add(ownerLabel(row, userName));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [allRows, userName]);

  const filteredRows = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00Z`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59Z`).getTime() : null;
    const q = search.trim().toLowerCase();

    return allRows
      .filter((c) => {
        if (quickView === "open" && !OPEN_STATUSES.includes(c.status)) return false;
        if (quickView === "unassigned" && c.changeOwner) return false;
        if (quickView === "action" && !ACTION_REQUIRED_STATUSES.includes(c.status)) return false;
        if (quickView === "mine" && myUserId && c.createdBy !== myUserId && c.submittedBy !== myUserId) return false;
        if (status && c.status !== status) return false;
        if (type && c.type !== type) return false;
        if (owner && ![c.changeOwner, c.qaResponsible, ownerLabel(c, userName)].includes(owner)) return false;

        const created = new Date(c.createdAt).getTime();
        if (from && created < from) return false;
        if (to && created > to) return false;

        if (!q) return true;
        const haystack = [
          c.changeNumber,
          c.title,
          c.description,
          c.proposedChangeBrief ?? "",
          c.justification ?? "",
          c.purposeOfChange ?? "",
          c.changeCategory ?? "",
          c.documentName ?? "",
          c.documentNumber ?? "",
          c.changeOwner ?? "",
          c.changeOwnerHod ?? "",
          c.qaResponsible ?? "",
          c.involvedDepartments.join(" "),
          CHANGE_STATUS_LABELS[c.status],
          c.type,
          priorityFor(c),
        ].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => compareRows(a, b, sortKey, sortDirection, userName));
  }, [allRows, fromDate, myUserId, owner, quickView, search, sortDirection, sortKey, status, toDate, type, userName]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize);
  const openCount = allRows.filter((c) => OPEN_STATUSES.includes(c.status)).length;
  const actionCount = allRows.filter((c) => ACTION_REQUIRED_STATUSES.includes(c.status)).length;
  const unassignedCount = allRows.filter((c) => !c.changeOwner).length;

  function setFilter(next: () => void) {
    next();
    setPage(0);
  }

  function clearFilters() {
    setStatus("");
    setType("");
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

  async function runRowAction(change: ChangeControlResponse, nextAction: ChangeAction, success: string) {
    try {
      await action.mutateAsync({
        id: change.id,
        action: nextAction,
        expectedVersion: change.version,
        reason: success,
      });
      toast.success(success);
    } catch {
      /* shared API interceptor displays the failure */
    }
  }

  function exportRows(format: "csv" | "excel") {
    const header = ["Number", "Title", "Type", "Purpose", "Owner", "QA Responsible", "Created", "Age", "Status", "Priority", "Target"];
    const rows = filteredRows.map((c) => [
      c.changeNumber,
      c.title,
      c.type,
      c.purposeOfChange ?? "",
      ownerLabel(c, userName),
      c.qaResponsible ?? "",
      formatDateTime(c.createdAt),
      String(ageInDays(c.createdAt)),
      CHANGE_STATUS_LABELS[c.status],
      priorityFor(c),
      formatDate(c.targetImplementationDate),
    ]);
    const separator = format === "csv" ? "," : "\t";
    const body = [header, ...rows].map((r) => r.map((cell) => quoteExport(cell, separator)).join(separator)).join("\n");
    const blob = new Blob([body], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `change-control-worklist.${format === "csv" ? "csv" : "xls"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">Change Control</h1>
          <p className="mt-1 text-body text-muted-foreground">Change request worklist</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/change-control/new">
              <FilePlus2 className="h-4 w-4" />
              New Change
            </Link>
          </Button>
          <ToolbarButton active={quickView === "action"} onClick={() => setFilter(() => setQuickView("action"))}>
            <Timer className="h-4 w-4" />
            Action Required
          </ToolbarButton>
          <ToolbarButton active={quickView === "mine"} onClick={() => setFilter(() => setQuickView("mine"))}>
            <Archive className="h-4 w-4" />
            My Changes
          </ToolbarButton>
          <ToolbarButton active={quickView === "all"} onClick={() => setFilter(() => setQuickView("all"))}>
            <ClipboardList className="h-4 w-4" />
            All Changes
          </ToolbarButton>
          <Button variant="outline" onClick={() => toast.info("Change-control setup controls will be wired in the admin milestone.")}>
            <Settings className="h-4 w-4" />
            Set-Up
          </Button>
          <Button variant="outline" onClick={() => document.getElementById("change-search")?.focus()}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <QuickPill active={quickView === "open"} onClick={() => setFilter(() => setQuickView("open"))}>All Open ({openCount})</QuickPill>
        <QuickPill active={quickView === "unassigned"} onClick={() => setFilter(() => setQuickView("unassigned"))}>Unassigned ({unassignedCount})</QuickPill>
        <QuickPill active={quickView === "action"} onClick={() => setFilter(() => setQuickView("action"))}>Action Required ({actionCount})</QuickPill>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label="Status" id="f-status">
            <Select id="f-status" value={status} onChange={(e) => setFilter(() => setStatus(e.target.value as ChangeStatus | ""))}>
              <option value="">All statuses</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{CHANGE_STATUS_LABELS[s]}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Classification" id="f-type">
            <Select id="f-type" value={type} onChange={(e) => setFilter(() => setType(e.target.value as ChangeTypeKey | ""))}>
              <option value="">All classifications</option>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{t === "MAJOR" ? "Major Change" : "Minor Change"}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Owner / QA" id="f-owner">
            <Select id="f-owner" value={owner} onChange={(e) => setFilter(() => setOwner(e.target.value))}>
              <option value="">All owners</option>
              {ownerOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Created From" id="f-from">
            <Input id="f-from" type="date" value={fromDate} onChange={(e) => setFilter(() => setFromDate(e.target.value))} />
          </FilterField>
          <FilterField label="Created To" id="f-to">
            <Input id="f-to" type="date" value={toDate} onChange={(e) => setFilter(() => setToDate(e.target.value))} />
          </FilterField>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => setPage(0)}>
            <Search className="h-4 w-4" />
            Find
          </Button>
          <Button variant="outline" onClick={clearFilters}>Clear</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <span className="text-label font-semibold text-foreground">Show Entries:</span>
            <Select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="w-24">
              {[10, 25, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}
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
              <Label htmlFor="change-search" className="text-label">Search:</Label>
              <Input id="change-search" value={search} onChange={(e) => setFilter(() => setSearch(e.target.value))} className="w-64" placeholder="Number, title, owner, document..." />
            </div>
          </div>
        </div>

        {listQuery.isLoading ? (
          <LoadingScreen label="Loading changes..." />
        ) : listQuery.isError ? (
          <div className="p-4"><ErrorAlert title="Error" message="Failed to load change requests." /></div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-body font-semibold">No change requests found</p>
            <p className="mt-1 text-label text-muted-foreground">Adjust the filters or create a new change request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                  <SortableHeader label="Number" sortKey="changeNumber" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="About" sortKey="title" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Type" sortKey="type" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader label="Created" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
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
                      <Link href={`/change-control/${c.id}`} className="font-semibold text-brand-primary hover:underline">{c.changeNumber}</Link>
                    </td>
                    <td className="max-w-[320px] px-3 py-3 align-middle">
                      <p className="truncate font-semibold">{c.title}</p>
                      <p className="mt-1 truncate text-label text-muted-foreground">{c.documentNumber ? `${c.documentNumber} - ` : ""}{c.purposeOfChange ?? c.proposedChangeBrief ?? "No purpose captured"}</p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Badge variant={c.type === "MAJOR" ? "warning" : "neutral"}>{c.type === "MAJOR" ? "Major" : "Minor"}</Badge>
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
                    <td className="px-3 py-3 align-middle"><ChangeStatusBadge status={c.status} /></td>
                    <td className="px-3 py-3 align-middle"><PriorityBadge priority={priorityFor(c)} /></td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex justify-end gap-2">
                        {inlineAction(c, action.isPending, runRowAction, router.push)}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/change-control/${c.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Change information for ${c.changeNumber}`} onClick={() => toast.info(`${c.changeNumber}: ${CHANGE_STATUS_LABELS[c.status]}`)}>
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
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>First</Button>
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-brand-primary px-3 text-body font-semibold text-white">{page + 1}</span>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>Last</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ToolbarButton({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return <Button type="button" variant={active ? "default" : "outline"} className={cn(active && "bg-brand-primary text-white hover:bg-brand-primary/90", className)} {...props} />;
}

function QuickPill({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn("rounded-full px-4 py-1.5 text-body font-semibold transition-colors", active ? "bg-brand-primary text-white shadow-sm" : "text-brand-primary hover:bg-accent", className)}
      {...props}
    />
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
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
        <span className="text-xs text-slate-600">{active ? (direction === "asc" ? "ASC" : "DESC") : "SORT"}</span>
      </button>
    </th>
  );
}

function inlineAction(
  change: ChangeControlResponse,
  pending: boolean,
  run: (change: ChangeControlResponse, action: ChangeAction, success: string) => Promise<void>,
  navigate: (href: string) => void
) {
  switch (change.status) {
    case "DRAFT":
      return <Button size="sm" disabled={pending} onClick={() => run(change, "submit-for-review", "Submitted for QA assessment")}>Submit</Button>;
    case "CHANGES_REQUESTED":
      return <Button size="sm" disabled={pending} onClick={() => run(change, "resubmit-for-review", "Resubmitted for QA assessment")}>Resubmit</Button>;
    case "UNDER_REVIEW":
      return <Button size="sm" disabled={pending} onClick={() => run(change, "submit-for-approval", "Submitted for approval")}>QA Approval</Button>;
    case "APPROVED":
      return <Button size="sm" disabled={pending} onClick={() => run(change, "start-implementation", "Implementation started")}>Start</Button>;
    case "IN_IMPLEMENTATION":
      return <Button size="sm" disabled={pending} onClick={() => run(change, "complete-implementation", "Implementation completed")}>Complete</Button>;
    case "IMPLEMENTED":
      return <Button size="sm" disabled={pending} onClick={() => run(change, "submit-for-closure", "Submitted for closure")}>Closure</Button>;
    case "PENDING_APPROVAL":
    case "PENDING_CLOSURE":
      return <Button size="sm" onClick={() => navigate(`/change-control/${change.id}`)}><CheckCircle2 className="h-4 w-4" />Review</Button>;
    default:
      return null;
  }
}

function ownerLabel(change: ChangeControlResponse, users: Map<number, string>) {
  if (change.changeOwner) return change.changeOwner;
  if (change.qaResponsible) return change.qaResponsible;
  if (change.createdBy) return users.get(change.createdBy) ?? `User #${change.createdBy}`;
  return "Unassigned";
}

function ageInDays(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function priorityFor(change: ChangeControlResponse): "Critical" | "Major" | "Minor" | "Low" {
  const closed = ["CLOSED", "CANCELLED", "REJECTED"].includes(change.status);
  const target = change.targetImplementationDate ? new Date(change.targetImplementationDate).getTime() : null;
  if (!closed && target && target < Date.now()) return "Critical";
  if (change.type === "MAJOR" || change.status === "PENDING_APPROVAL" || change.status === "PENDING_CLOSURE") return "Major";
  if (change.status === "IN_IMPLEMENTATION" || change.status === "UNDER_REVIEW") return "Minor";
  return "Low";
}

function PriorityBadge({ priority }: { priority: ReturnType<typeof priorityFor> }) {
  const variant = priority === "Critical" ? "error" : priority === "Major" ? "warning" : priority === "Minor" ? "info" : "neutral";
  return <Badge variant={variant}>{priority}</Badge>;
}

function compareRows(a: ChangeControlResponse, b: ChangeControlResponse, key: SortKey, direction: SortDirection, users: Map<number, string>) {
  const sign = direction === "asc" ? 1 : -1;
  const value = (row: ChangeControlResponse): string | number => {
    switch (key) {
      case "owner": return ownerLabel(row, users);
      case "type": return row.type;
      case "status": return CHANGE_STATUS_LABELS[row.status];
      case "createdAt": return new Date(row.createdAt).getTime();
      case "targetImplementationDate": return row.targetImplementationDate ? new Date(row.targetImplementationDate).getTime() : Number.MAX_SAFE_INTEGER;
      case "age": return ageInDays(row.createdAt);
      case "priority": return priorityRank(priorityFor(row));
      case "changeNumber": return row.changeNumber;
      case "title": return row.title;
      default: return row.title;
    }
  };
  const av = value(a);
  const bv = value(b);
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
  return String(av).localeCompare(String(bv)) * sign;
}

function priorityRank(priority: ReturnType<typeof priorityFor>) {
  return { Critical: 4, Major: 3, Minor: 2, Low: 1 }[priority];
}

function quoteExport(value: string, separator: string) {
  if (separator === "\t") return value.replace(/\t/g, " ");
  return `"${value.replace(/"/g, '""')}"`;
}
