"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useComplaintList } from "@/hooks/useComplaint";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { ComplaintStatusBadge } from "@/components/complaints/ComplaintStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import {
  COMPLAINT_STATUS_LABELS,
  SEVERITY_VARIANT,
  type ComplaintResponse,
  type ComplaintSeverity,
  type ComplaintSource,
  type ComplaintStatus,
} from "@/types/complaint";

const ALL_STATUSES = Object.keys(COMPLAINT_STATUS_LABELS) as ComplaintStatus[];

export default function ComplaintsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [source, setSource] = useState<ComplaintSource | "">("");
  const [severity, setSeverity] = useState<ComplaintSeverity | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const listQuery = useComplaintList({ status, source, severity, page, size: 10, sort: `${sortField},${sortDirection}` });

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field); setSortDirection(direction); setPage(0);
  }

  const columns: Column<ComplaintResponse>[] = [
    { key: "complaintNo", header: "Complaint No.", sortable: true, render: (c) => <span className="font-medium">{c.complaintNo}</span> },
    { key: "complaintDescription", header: "Description", render: (c) => <span className="line-clamp-1">{c.complaintDescription}</span> },
    { key: "source", header: "Source", hideOnMobile: true, render: (c) => <Badge variant={c.source === "CUSTOMER" ? "info" : "neutral"}>{c.source}</Badge> },
    { key: "severity", header: "Severity", sortable: true, render: (c) => <Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge> },
    { key: "status", header: "Status", sortable: true, render: (c) => <ComplaintStatusBadge status={c.status} /> },
    { key: "reportedDate", header: "Reported", sortable: true, hideOnMobile: true, render: (c) => formatDate(c.reportedDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5"><Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as ComplaintStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{COMPLAINT_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="f-source">Source</Label>
        <Select id="f-source" value={source} onChange={(e) => { setSource(e.target.value as ComplaintSource | ""); setPage(0); }}>
          <option value="">All sources</option><option value="CUSTOMER">Customer</option><option value="INTERNAL">Internal</option>
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="f-sev">Severity</Label>
        <Select id="f-sev" value={severity} onChange={(e) => { setSeverity(e.target.value as ComplaintSeverity | ""); setPage(0); }}>
          <option value="">All severities</option><option value="CRITICAL">Critical</option><option value="MAJOR">Major</option><option value="MINOR">Minor</option>
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<ComplaintResponse>
      title="Complaint Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/complaints/new")}
      columns={columns}
      rows={listQuery.data?.content}
      getRowId={(c) => c.id}
      onRowClick={(c) => router.push(`/complaints/${c.id}`)}
      rowActions={(c) => <Button asChild variant="outline" size="sm"><Link href={`/complaints/${c.id}`}>View</Link></Button>}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No complaints found"
      errorText="Failed to load complaints"
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      page={listQuery.data?.page ?? 0}
      totalPages={listQuery.data?.totalPages ?? 0}
      totalElements={listQuery.data?.totalElements ?? 0}
      onPageChange={setPage}
    />
  );
}
