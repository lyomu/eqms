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
  Info,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useComplaintList } from "@/hooks/useComplaint";
import { useUsers } from "@/hooks/useDocuments";
import { useAuth } from "@/hooks/useAuth";
import { ComplaintStatusBadge } from "@/components/complaints/ComplaintStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import {
  COMPLAINT_STATUS_LABELS,
  SEVERITY_VARIANT,
  type ComplaintResponse,
  type ComplaintSeverity,
  type ComplaintSource,
  type ComplaintStatus,
} from "@/types/complaint";

const OPEN_STATUSES: ComplaintStatus[] = ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "RESOLVED"];
const ACTION_REQUIRED_STATUSES: ComplaintStatus[] = ["OPEN", "ACKNOWLEDGED", "UNDER_INVESTIGATION"];

// Complaints have no formal dueDate; 30 days is the standard handling target.
const DUE_DAYS = 30;

type SortKey =
  | "complaintNo"
  | "description"
  | "severity"
  | "reportedBy"
  | "received"
  | "assigned"
  | "age"
  | "status";
type SortDirection = "asc" | "desc";
type QuickView = "open" | "overdue" | "due-today" | "due-tomorrow" | "unassigned" | "action" | "mine" | "all";

export default function ComplaintsListPage() {
  const router = useRouter();
  const [quickView, setQuickView] = useState<QuickView>("open");
  const [source, setSource] = useState<ComplaintSource | "">("");
  const [severity, setSeverity] = useState<ComplaintSeverity | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("received");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const usersQuery = useUsers();
  const { currentUser } = useAuth();
  const listQuery = useComplaintList({ page: 0, size: 250, sort: "createdAt,desc" });

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
        const isOpen = OPEN_STATUSES.includes(c.status);
        const age = ageInDays(c.createdAt);

        if (quickView === "open" && !isOpen) return false;
        if (quickView === "overdue" && (!isOpen || age < DUE_DAYS)) return false;
        if (quickView === "due-today" && (!isOpen || age !== DUE_DAYS - 1)) return false;
        if (quickView === "due-tomorrow" && (!isOpen || age !== DUE_DAYS - 2)) return false;
        if (quickView === "unassigned" && c.ownerId !== null) return false;
        if (quickView === "action" && !ACTION_REQUIRED_STATUSES.includes(c.status)) return false;
        if (quickView === "mine" && myUserId && c.ownerId !== myUserId && c.createdBy !== myUserId) return false;

        if (source && c.source !== source) return false;
        if (severity && c.severity !== severity) return false;

        const received = new Date(c.reportedDate ?? c.createdAt).getTime();
        if (from && received < from) return false;
        if (to && received > to) return false;

        if (!q) return true;
        const haystack = [
          c.complaintNo,
          c.complaintDescription,
          c.source,
          c.severity,
          c.reportedBy ?? "",
          COMPLAINT_STATUS_LABELS[c.status],
          c.ownerId ? (userName.get(c.ownerId) ?? "") : "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => compareRows(a, b, sortKey, sortDir, userName));
  }, [allRows, fromDate, toDate, search, quickView, source, severity, myUserId, sortKey, sortDir, userName]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize);

  const openCount = allRows.filter((c) => OPEN_STATUSES.includes(c.status)).length;
  const overdueCount = allRows.filter((c) => OPEN_STATUSES.includes(c.status) && ageInDays(c.createdAt) >= DUE_DAYS).length;
  const dueTodayCount = allRows.filter((c) => OPEN_STATUSES.includes(c.status) && ageInDays(c.createdAt) === DUE_DAYS - 1).length;
  const dueTomorrowCount = allRows.filter((c) => OPEN_STATUSES.includes(c.status) && ageInDays(c.createdAt) === DUE_DAYS - 2).length;
  const unassignedCount = allRows.filter((c) => c.ownerId === null).length;

  function setFilter(next: () => void) {
    next();
    setPage(0);
  }

  function clearFilters() {
    setSource("");
    setSeverity("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setQuickView("open");
    setPage(0);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function exportRows(format: "csv" | "excel") {
    const header = ["Number", "About", "Type", "From", "Received", "Assigned", "Age", "Status"];
    const rows = filteredRows.map((c) => [
      c.complaintNo,
      c.complaintDescription.slice(0, 80),
      c.severity,
      c.reportedBy ?? "",
      formatDateTime(c.reportedDate ?? c.createdAt),
      c.ownerId ? (userName.get(c.ownerId) ?? `User #${c.ownerId}`) : "Unassigned",
      String(ageInDays(c.createdAt)),
      COMPLAINT_STATUS_LABELS[c.status],
    ]);
    const sep = format === "csv" ? "," : "\t";
    const body = [header, ...rows]
      .map((r) => r.map((cell) => quoteCell(cell, sep)).join(sep))
      .join("\n");
    const blob = new Blob([body], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `complaints.${format === "csv" ? "csv" : "xls"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* ── Title + toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">Complaint Management</h1>
          <p className="mt-1 text-body text-muted-foreground">Customer and internal complaint worklist</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/complaints/new">
              <FilePlus2 className="h-4 w-4" />
              New Complaints
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
            My Complaints
          </ToolbarButton>
          <ToolbarButton
            active={quickView === "all"}
            onClick={() => setFilter(() => setQuickView("all"))}
          >
            <Eye className="h-4 w-4" />
            All Complaints
          </ToolbarButton>
          <Button
            variant="outline"
            onClick={() => toast.info("Complaint setup controls will be wired in the admin milestone.")}
          >
            <Settings className="h-4 w-4" />
            Set-Up
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById("complaints-search")?.focus()}
          >
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* ── Quick-view pills ── */}
      <div className="flex flex-wrap items-center gap-3">
        <QuickPill active={quickView === "open"} onClick={() => setFilter(() => setQuickView("open"))}>
          All Open ({openCount})
        </QuickPill>
        <QuickPill active={quickView === "overdue"} onClick={() => setFilter(() => setQuickView("overdue"))}>
          Overdue ({overdueCount})
        </QuickPill>
        <QuickPill active={quickView === "due-today"} onClick={() => setFilter(() => setQuickView("due-today"))}>
          Due Today ({dueTodayCount})
        </QuickPill>
        <QuickPill
          active={quickView === "due-tomorrow"}
          onClick={() => setFilter(() => setQuickView("due-tomorrow"))}
        >
          Due Tomorrow ({dueTomorrowCount})
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="From" id="f-source">
            <Select
              id="f-source"
              value={source}
              onChange={(e) => setFilter(() => setSource(e.target.value as ComplaintSource | ""))}
            >
              <option value="">All</option>
              <option value="CUSTOMER">Customer</option>
              <option value="INTERNAL">Internal</option>
            </Select>
          </FilterField>
          <FilterField label="About" id="f-severity">
            <Select
              id="f-severity"
              value={severity}
              onChange={(e) => setFilter(() => setSeverity(e.target.value as ComplaintSeverity | ""))}
            >
              <option value="">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
            </Select>
          </FilterField>
          <FilterField label="Date From" id="f-date-from">
            <Input
              id="f-date-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFilter(() => setFromDate(e.target.value))}
            />
          </FilterField>
          <FilterField label="Date To" id="f-date-to">
            <Input
              id="f-date-to"
              type="date"
              value={toDate}
              onChange={(e) => setFilter(() => setToDate(e.target.value))}
            />
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
        {/* table toolbar */}
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
              <Label htmlFor="complaints-search" className="text-label">
                Search:
              </Label>
              <Input
                id="complaints-search"
                value={search}
                onChange={(e) => setFilter(() => setSearch(e.target.value))}
                className="w-64"
                placeholder="Number, description, source..."
              />
            </div>
          </div>
        </div>

        {listQuery.isLoading ? (
          <LoadingScreen label="Loading complaints..." />
        ) : listQuery.isError ? (
          <div className="p-4">
            <ErrorAlert title="Error" message="Failed to load complaints." />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-body font-semibold">No complaints found</p>
            <p className="mt-1 text-label text-muted-foreground">
              Adjust the filters or log a new complaint.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                  <SortableHeader
                    label="Number"
                    sortKey="complaintNo"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="About"
                    sortKey="description"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Type"
                    sortKey="severity"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="From"
                    sortKey="reportedBy"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <th className="px-3 py-3 font-semibold">Description content</th>
                  <SortableHeader
                    label="Received"
                    sortKey="received"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Assigned"
                    sortKey="assigned"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Age"
                    sortKey="age"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    activeKey={sortKey}
                    direction={sortDir}
                    onSort={toggleSort}
                  />
                  <th className="px-3 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((c) => {
                  const expanded = expandedId === c.id;
                  const ownerName = c.ownerId ? (userName.get(c.ownerId) ?? `User #${c.ownerId}`) : "Unassigned";
                  const receivedStr = formatDateTime(c.reportedDate ?? c.createdAt).replace(" UTC", "");
                  const age = ageInDays(c.createdAt);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/35">
                      <td className="px-3 py-3 align-middle">
                        <Link
                          href={`/complaints/${c.id}`}
                          className="font-semibold text-brand-primary hover:underline"
                        >
                          {c.complaintNo}
                        </Link>
                      </td>
                      <td className="max-w-[160px] px-3 py-3 align-middle">
                        <p className="truncate font-semibold text-foreground">
                          {c.complaintDescription}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <Badge variant={SEVERITY_VARIANT[c.severity]}>
                          {c.severity.charAt(0) + c.severity.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="max-w-[160px] px-3 py-3 align-middle">
                        <p className="truncate text-muted-foreground">{c.reportedBy ?? "—"}</p>
                      </td>
                      <td className="max-w-[220px] px-3 py-3 align-top">
                        <button
                          type="button"
                          className="mb-1 text-label font-semibold text-brand-primary hover:underline"
                          onClick={() => setExpandedId(expanded ? null : c.id)}
                        >
                          {expanded ? "…Show less" : "…Read more"}
                        </button>
                        <p
                          className={cn(
                            "text-label text-muted-foreground",
                            !expanded && "line-clamp-3"
                          )}
                        >
                          {c.complaintDescription}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="whitespace-nowrap">{receivedStr}</span>
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
                        <ComplaintStatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          {nextActionButton(c, router.push)}
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/complaints/${c.id}`}>
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Info for ${c.complaintNo}`}
                            onClick={() =>
                              toast.info(
                                `${c.complaintNo}: ${COMPLAINT_STATUS_LABELS[c.status]}`
                              )
                            }
                          >
                            <Info className="h-4 w-4 text-warning" />
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
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(0)}
              >
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

// ─── Toolbar / pill sub-components ────────────────────────────────────────────

function ToolbarButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
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
          ? "bg-brand-primary text-white shadow-sm"
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
  direction: SortDirection;
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
        <span className="text-xs text-slate-500">
          {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

// ─── Row action button (navigates to detail for all transitions) ───────────────

function nextActionButton(c: ComplaintResponse, navigate: (href: string) => void) {
  const href = `/complaints/${c.id}`;
  switch (c.status) {
    case "OPEN":
      return (
        <Button size="sm" onClick={() => navigate(href)}>
          Acknowledge
        </Button>
      );
    case "ACKNOWLEDGED":
      return (
        <Button size="sm" variant="outline" onClick={() => navigate(href)}>
          Investigate
        </Button>
      );
    case "UNDER_INVESTIGATION":
      return (
        <Button size="sm" variant="outline" onClick={() => navigate(href)}>
          Resolve
        </Button>
      );
    case "RESOLVED":
      return (
        <Button size="sm" variant="outline" onClick={() => navigate(href)}>
          Close
        </Button>
      );
    default:
      return null;
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function ageInDays(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function compareRows(
  a: ComplaintResponse,
  b: ComplaintResponse,
  key: SortKey,
  direction: SortDirection,
  users: Map<number, string>
) {
  const sign = direction === "asc" ? 1 : -1;
  const val = (c: ComplaintResponse): string | number => {
    switch (key) {
      case "complaintNo":
        return c.complaintNo;
      case "description":
        return c.complaintDescription;
      case "severity": {
        const rank: Record<string, number> = { CRITICAL: 3, MAJOR: 2, MINOR: 1 };
        return rank[c.severity] ?? 0;
      }
      case "reportedBy":
        return c.reportedBy ?? "";
      case "received":
        return new Date(c.reportedDate ?? c.createdAt).getTime();
      case "assigned":
        return c.ownerId ? (users.get(c.ownerId) ?? "") : "";
      case "age":
        return ageInDays(c.createdAt);
      case "status":
        return COMPLAINT_STATUS_LABELS[c.status];
      default:
        return c.complaintNo;
    }
  };
  const av = val(a);
  const bv = val(b);
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
  return String(av).localeCompare(String(bv)) * sign;
}

function quoteCell(value: string, sep: string) {
  if (sep === "\t") return value.replace(/\t/g, " ");
  return `"${value.replace(/"/g, '""')}"`;
}
