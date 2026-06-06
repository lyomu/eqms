"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { NcStatusBadge, NcTypeBadge } from "@/components/nonconformances/NonConformanceBadges";
import { useNonConformanceList } from "@/hooks/useNonConformances";
import { formatDate } from "@/lib/format";
import { NC_STATUS_LABELS, NC_TYPE_LABELS, type NcStatus, type NcType, type NonConformanceResponse } from "@/types/nonconformance";

export default function NonConformancesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<NcStatus | "">("");
  const [type, setType] = useState<NcType | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const query = useNonConformanceList({ status, type, page, size: 10, sort: `${sortField},${sortDirection}` });
  const columns: Column<NonConformanceResponse>[] = [
    { key: "ncNo", header: "NC Number", sortable: true, render: (n) => <span className="font-medium">{n.ncNo}</span> },
    { key: "ncType", header: "Type", render: (n) => <NcTypeBadge type={n.ncType} /> },
    { key: "description", header: "Description", render: (n) => <span className="line-clamp-1">{n.description}</span> },
    { key: "status", header: "Status", render: (n) => <NcStatusBadge status={n.status} /> },
    { key: "discoveredDate", header: "Discovered Date", hideOnMobile: true, render: (n) => formatDate(n.discoveredDate) },
    { key: "ownerId", header: "Owner", hideOnMobile: true, render: (n) => n.ownerId ? `User #${n.ownerId}` : "Unassigned" },
  ];
  const filterBar = <div className="grid grid-cols-1 gap-3 md:grid-cols-3"><div className="space-y-1.5"><Label>Status</Label><Select value={status} onChange={(e) => setStatus(e.target.value as NcStatus | "")}><option value="">All statuses</option>{Object.entries(NC_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div><div className="space-y-1.5"><Label>Type</Label><Select value={type} onChange={(e) => setType(e.target.value as NcType | "")}><option value="">All types</option>{Object.entries(NC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div><div className="space-y-1.5"><Label>Date range</Label><Select><option>All dates</option><option>Last 30 days</option><option>This quarter</option></Select></div></div>;
  return <ModuleListPage title="Non-Conformance" filterBar={filterBar} createLabel="Create New" onCreate={() => router.push("/non-conformances/new")} columns={columns} rows={query.data?.content} getRowId={(n) => n.id} onRowClick={(n) => router.push(`/non-conformances/${n.id}`)} rowActions={(n) => <Button asChild size="sm" variant="outline"><Link href={`/non-conformances/${n.id}`}>View</Link></Button>} isLoading={query.isLoading} isError={query.isError} emptyText="No non-conformances found" errorText="Failed to load non-conformances" sortField={sortField} sortDirection={sortDirection} onSortChange={(f, d) => { setSortField(f); setSortDirection(d); }} page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} totalElements={query.data?.totalElements ?? 0} onPageChange={setPage} />;
}
