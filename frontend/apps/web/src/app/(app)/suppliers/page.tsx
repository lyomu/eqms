"use client";

import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FilePlus2,
  Info,
  MapPin,
  Phone,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { useSupplierList } from "@/hooks/useSuppliers";
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
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_TYPE_LABELS,
  type SupplierResponse,
  type SupplierStatus,
  type SupplierType,
} from "@/types/supplier";

// ─── Static maps ──────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: SupplierStatus[] = ["QUALIFIED", "CONDITIONAL"];

const STATUS_STYLE: Record<SupplierStatus, string> = {
  QUALIFIED:   "bg-success/15 text-success ring-success/20",
  CONDITIONAL: "bg-warning/20 text-[#7A5A00] ring-warning/30",
  UNAPPROVED:  "bg-error/15 text-error ring-error/20",
};

const TYPE_STYLE: Record<SupplierType, string> = {
  RAW_MATERIAL: "bg-blue-100 text-blue-800",
  PACKAGING:    "bg-purple-100 text-purple-800",
  SERVICE:      "bg-teal-100 text-teal-800",
};

// ─── Sort / view types ────────────────────────────────────────────────────────

type SortKey = "code" | "name" | "type" | "status" | "contact" | "location" | "qualified" | "age" | "owner";
type SortDir  = "asc" | "desc";
type QuickView = "active" | "conditional" | "unapproved" | "unassigned" | "mine" | "all";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const router = useRouter();

  const [quickView,   setQuickView]   = useState<QuickView>("active");
  const [typeFilter,  setTypeFilter]  = useState<SupplierType | "">("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "">("");
  const [certFilter,  setCertFilter]  = useState<"CERTIFIED" | "EXPIRED" | "PENDING" | "">("");
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");
  const [search,      setSearch]      = useState("");
  const [pageSize,    setPageSize]    = useState(50);
  const [page,        setPage]        = useState(0);
  const [sortKey,     setSortKey]     = useState<SortKey>("name");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");
  const [expandedId,  setExpandedId]  = useState<number | null>(null);

  const usersQuery   = useUsers();
  const { currentUser } = useAuth();
  const listQuery    = useSupplierList({ page: 0, size: 500, sort: "supplierName,asc" });

  const userNameMap = useMemo(() => {
    const m = new Map<number, string>();
    usersQuery.data?.forEach((u) => m.set(u.id, u.fullName));
    return m;
  }, [usersQuery.data]);

  const allRows  = listQuery.data?.content ?? [];
  const myUserId = currentUser?.id ?? null;

  const filteredRows = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00Z`).getTime() : null;
    const to   = toDate   ? new Date(`${toDate}T23:59:59Z`).getTime()   : null;
    const q    = search.trim().toLowerCase();

    return allRows
      .filter((s) => {
        const isActive = ACTIVE_STATUSES.includes(s.status);

        if (quickView === "active"      && !isActive)                      return false;
        if (quickView === "conditional" && s.status !== "CONDITIONAL")     return false;
        if (quickView === "unapproved"  && s.status !== "UNAPPROVED")      return false;
        if (quickView === "unassigned"  && s.ownerId !== null)             return false;
        if (quickView === "mine"        && myUserId && s.ownerId !== myUserId && s.createdBy !== myUserId) return false;

        if (typeFilter   && s.supplierType !== typeFilter)   return false;
        if (statusFilter && s.status       !== statusFilter) return false;

        const created = new Date(s.createdAt).getTime();
        if (from && created < from) return false;
        if (to   && created > to)   return false;

        if (!q) return true;
        const hay = [
          s.supplierCode,
          s.supplierName,
          SUPPLIER_TYPE_LABELS[s.supplierType],
          SUPPLIER_STATUS_LABELS[s.status],
          s.contactPerson ?? "",
          s.email         ?? "",
          s.phone         ?? "",
          s.location,
          s.ownerId ? (userNameMap.get(s.ownerId) ?? "") : "",
        ].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => compareRows(a, b, sortKey, sortDir, userNameMap));
  }, [allRows, fromDate, toDate, search, quickView, typeFilter, statusFilter, myUserId, sortKey, sortDir, userNameMap]);

  const totalPages  = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(page * pageSize, page * pageSize + pageSize);

  // Quick-pill counts
  const activeCount      = allRows.filter((s) => ACTIVE_STATUSES.includes(s.status)).length;
  const conditionalCount = allRows.filter((s) => s.status === "CONDITIONAL").length;
  const unapprovedCount  = allRows.filter((s) => s.status === "UNAPPROVED").length;
  const unassignedCount  = allRows.filter((s) => s.ownerId === null).length;

  function setFilter(fn: () => void) { fn(); setPage(0); }

  function clearFilters() {
    setTypeFilter("");
    setStatusFilter("");
    setCertFilter("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setQuickView("active");
    setPage(0);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function exportRows(format: "csv" | "excel") {
    const header = ["Code", "Name", "Type", "Status", "Contact", "Email", "Phone", "Location", "Qualified", "Age", "Owner"];
    const rows = filteredRows.map((s) => [
      s.supplierCode,
      s.supplierName,
      SUPPLIER_TYPE_LABELS[s.supplierType],
      SUPPLIER_STATUS_LABELS[s.status],
      s.contactPerson ?? "",
      s.email         ?? "",
      s.phone         ?? "",
      s.location,
      s.qualificationDate ? formatDate(s.qualificationDate) : "",
      String(ageInDays(s.createdAt)),
      s.ownerId ? (userNameMap.get(s.ownerId) ?? `User #${s.ownerId}`) : "Unassigned",
    ]);
    const sep  = format === "csv" ? "," : "\t";
    const body = [header, ...rows]
      .map((r) => r.map((c) => (sep === "\t" ? c.replace(/\t/g, " ") : `"${c.replace(/"/g, '""')}"`)).join(sep))
      .join("\n");
    const blob = new Blob([body], {
      type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url;
    a.download = `suppliers.${format === "csv" ? "csv" : "xls"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* ── Header + toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-h1 text-brand-primary">Supplier Quality</h1>
          <p className="mt-0.5 text-label text-muted-foreground">Approved vendor register &amp; qualification worklist</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="bg-destructive text-white hover:bg-destructive/90">
            <Link href="/suppliers/new">
              <FilePlus2 className="h-4 w-4" />
              New Supplier
            </Link>
          </Button>
          <ToolbarButton active={quickView === "mine"} onClick={() => setFilter(() => setQuickView("mine"))}>
            <UserRound className="h-4 w-4" />
            My Suppliers
          </ToolbarButton>
          <ToolbarButton active={quickView === "all"} onClick={() => setFilter(() => setQuickView("all"))}>
            <Eye className="h-4 w-4" />
            All Suppliers
          </ToolbarButton>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
            Set-Up
          </Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById("supplier-search")?.focus()}>
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>

      {/* ── Quick-view pills ── */}
      <div className="flex flex-wrap items-center gap-3">
        <QuickPill active={quickView === "active"}      onClick={() => setFilter(() => setQuickView("active"))}>
          All Active ({activeCount})
        </QuickPill>
        <QuickPill active={quickView === "conditional"} onClick={() => setFilter(() => setQuickView("conditional"))}>
          Conditional ({conditionalCount})
        </QuickPill>
        <QuickPill active={quickView === "unapproved"}  onClick={() => setFilter(() => setQuickView("unapproved"))}>
          <AlertCircle className="h-3.5 w-3.5" />
          Unapproved ({unapprovedCount})
        </QuickPill>
        <QuickPill active={quickView === "unassigned"}  onClick={() => setFilter(() => setQuickView("unassigned"))}>
          Unassigned ({unassignedCount})
        </QuickPill>
      </div>

      {/* ── Filter panel ── */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Type" id="f-type">
            <Select id="f-type" value={typeFilter} onChange={(e) => setFilter(() => setTypeFilter(e.target.value as SupplierType | ""))}>
              <option value="">All Types</option>
              {(Object.keys(SUPPLIER_TYPE_LABELS) as SupplierType[]).map((t) => (
                <option key={t} value={t}>{SUPPLIER_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Status" id="f-status">
            <Select id="f-status" value={statusFilter} onChange={(e) => setFilter(() => setStatusFilter(e.target.value as SupplierStatus | ""))}>
              <option value="">All Statuses</option>
              {(Object.keys(SUPPLIER_STATUS_LABELS) as SupplierStatus[]).map((s) => (
                <option key={s} value={s}>{SUPPLIER_STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Certification" id="f-cert">
            <Select id="f-cert" value={certFilter} onChange={(e) => setFilter(() => setCertFilter(e.target.value as typeof certFilter))}>
              <option value="">All Certifications</option>
              <option value="CERTIFIED">Certified</option>
              <option value="EXPIRED">Expired</option>
              <option value="PENDING">Pending</option>
            </Select>
          </FilterField>
          <FilterField label="Date Added From" id="f-date-from">
            <div className="flex items-center gap-1">
              <Input id="f-date-from" type="date" value={fromDate} onChange={(e) => setFilter(() => setFromDate(e.target.value))} />
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
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

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        {/* Table toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <span className="text-label font-semibold">Show Entries:</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="w-24"
            >
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
              <Label htmlFor="supplier-search" className="text-label">Search:</Label>
              <Input
                id="supplier-search"
                value={search}
                onChange={(e) => setFilter(() => setSearch(e.target.value))}
                className="w-64"
                placeholder="Code, name, contact, location…"
              />
            </div>
          </div>
        </div>

        {listQuery.isLoading ? (
          <LoadingScreen label="Loading suppliers…" />
        ) : listQuery.isError ? (
          <div className="p-4">
            <ErrorAlert title="Error" message="Failed to load suppliers." />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-body font-semibold">No suppliers found</p>
            <p className="mt-1 text-label text-muted-foreground">Adjust the filters or add a new supplier.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <Th label="Code"       sortKey="code"      activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Name"       sortKey="name"      activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Type"       sortKey="type"      activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Status"     sortKey="status"    activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Contact"    sortKey="contact"   activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Location"   sortKey="location"  activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Qualified"  sortKey="qualified" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Age (days)" sortKey="age"       activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <Th label="Owner"      sortKey="owner"     activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-3 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((s) => {
                  const expanded  = expandedId === s.id;
                  const ownerName = s.ownerId ? (userNameMap.get(s.ownerId) ?? `User #${s.ownerId}`) : "Unassigned";
                  const age       = ageInDays(s.createdAt);

                  return (
                    <>
                      <tr
                        key={s.id}
                        className={cn(
                          "border-b border-border hover:bg-accent/35",
                          expanded && "bg-accent/20"
                        )}
                      >
                        {/* Code */}
                        <td className="px-3 py-3 align-middle">
                          <Link
                            href={`/suppliers/${s.id}`}
                            className="font-mono font-semibold text-brand-primary hover:underline"
                          >
                            {s.supplierCode}
                          </Link>
                        </td>

                        {/* Name */}
                        <td className="max-w-[200px] px-3 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <button
                              type="button"
                              className="truncate font-semibold text-foreground hover:text-brand-primary hover:underline"
                              onClick={() => setExpandedId(expanded ? null : s.id)}
                            >
                              {s.supplierName}
                            </button>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-3 py-3 align-middle">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            TYPE_STYLE[s.supplierType]
                          )}>
                            {SUPPLIER_TYPE_LABELS[s.supplierType]}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 align-middle">
                          <span className={cn(
                            "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                            STATUS_STYLE[s.status]
                          )}>
                            {SUPPLIER_STATUS_LABELS[s.status]}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{s.contactPerson ?? "—"}</span>
                          </span>
                        </td>

                        {/* Location */}
                        <td className="max-w-[140px] px-3 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{s.location}</span>
                          </span>
                        </td>

                        {/* Qualified */}
                        <td className="px-3 py-3 align-middle">
                          {s.qualificationDate ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="whitespace-nowrap">{formatDate(s.qualificationDate)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not qualified</span>
                          )}
                        </td>

                        {/* Age */}
                        <td className="px-3 py-3 align-middle">
                          <span className={cn(
                            "font-medium",
                            age > 365 && "text-warning",
                            age > 730 && "text-error"
                          )}>
                            {age}
                          </span>
                        </td>

                        {/* Owner */}
                        <td className="px-3 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className={cn(ownerName === "Unassigned" && "text-muted-foreground")}>
                              {ownerName}
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/suppliers/${s.id}`}>
                                <Eye className="h-4 w-4" />
                                View
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedId(expanded ? null : s.id)}
                              aria-label={expanded ? "Collapse details" : "Expand details"}
                            >
                              <Info className={cn("h-4 w-4", expanded ? "text-brand-primary" : "text-warning")} />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded detail row ── */}
                      {expanded && (
                        <tr key={`${s.id}-detail`} className="border-b border-border bg-accent/10">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                              <DetailCell label="Email">
                                {s.email ? (
                                  <a href={`mailto:${s.email}`} className="text-brand-primary hover:underline">
                                    {s.email}
                                  </a>
                                ) : "—"}
                              </DetailCell>
                              <DetailCell label="Phone">
                                {s.phone ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    {s.phone}
                                  </span>
                                ) : "—"}
                              </DetailCell>
                              <DetailCell label="Supplier Type">{SUPPLIER_TYPE_LABELS[s.supplierType]}</DetailCell>
                              <DetailCell label="Added">{formatDate(s.createdAt)}</DetailCell>
                              <DetailCell label="Qualification Date">
                                {s.qualificationDate ? formatDate(s.qualificationDate) : "Not yet qualified"}
                              </DetailCell>
                              <DetailCell label="Location">{s.location}</DetailCell>
                              <DetailCell label="Owner">{ownerName}</DetailCell>
                              <DetailCell label="Supplier ID">#{s.id}</DetailCell>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <Button asChild size="sm">
                                <Link href={`/suppliers/${s.id}`}>Open Full Record</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/suppliers/${s.id}#certifications`}>Certifications</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/suppliers/${s.id}#performance`}>Performance</Link>
                              </Button>
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/suppliers/${s.id}#findings`}>Findings</Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>First</Button>
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
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>Last</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToolbarButton({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
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

function QuickPill({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body font-semibold transition-colors",
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

function Th({
  label, sortKey, activeKey, dir, onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
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
        <span className="text-xs text-slate-500">{active ? (dir === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

function DetailCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-body">{children}</p>
    </div>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function ageInDays(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function compareRows(
  a: SupplierResponse,
  b: SupplierResponse,
  key: SortKey,
  dir: SortDir,
  users: Map<number, string>
) {
  const sign = dir === "asc" ? 1 : -1;
  const val = (s: SupplierResponse): string | number => {
    switch (key) {
      case "code":      return s.supplierCode;
      case "name":      return s.supplierName;
      case "type":      return SUPPLIER_TYPE_LABELS[s.supplierType];
      case "status":    return SUPPLIER_STATUS_LABELS[s.status];
      case "contact":   return s.contactPerson ?? "";
      case "location":  return s.location;
      case "qualified": return s.qualificationDate ? new Date(s.qualificationDate).getTime() : 0;
      case "age":       return ageInDays(s.createdAt);
      case "owner":     return s.ownerId ? (users.get(s.ownerId) ?? "") : "";
      default:          return s.supplierName;
    }
  };
  const av = val(a);
  const bv = val(b);
  if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
  return String(av).localeCompare(String(bv)) * sign;
}
