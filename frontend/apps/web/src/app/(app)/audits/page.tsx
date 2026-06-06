"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuditList } from "@/hooks/useAudit";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { AuditStatusBadge } from "@/components/audits/AuditStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { AUDIT_STATUS_LABELS, type AuditResponse, type AuditStatus, type AuditTypeKey } from "@/types/audit";

const ALL_STATUSES = Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[];

export default function AuditsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuditStatus | "">("");
  const [type, setType] = useState<AuditTypeKey | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const listQuery = useAuditList({ status, type, page, size: 10, sort: `${sortField},${sortDirection}` });

  function onSortChange(field: string, direction: SortDirection) { setSortField(field); setSortDirection(direction); setPage(0); }

  const columns: Column<AuditResponse>[] = [
    { key: "auditNo", header: "Audit No.", sortable: true, render: (a) => <span className="font-medium">{a.auditNo}</span> },
    { key: "auditTitle", header: "Title", sortable: true, render: (a) => <span className="truncate">{a.auditTitle}</span> },
    { key: "auditType", header: "Type", hideOnMobile: true, render: (a) => <Badge variant={a.auditType === "SUPPLIER" ? "info" : "neutral"}>{a.auditType}</Badge> },
    { key: "status", header: "Status", sortable: true, render: (a) => <AuditStatusBadge status={a.status} /> },
    { key: "auditDate", header: "Audit Date", sortable: true, hideOnMobile: true, render: (a) => formatDate(a.auditDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as AuditStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>{ALL_STATUSES.map((s) => <option key={s} value={s}>{AUDIT_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="f-type">Type</Label>
        <Select id="f-type" value={type} onChange={(e) => { setType(e.target.value as AuditTypeKey | ""); setPage(0); }}>
          <option value="">All types</option><option value="INTERNAL">Internal</option><option value="SUPPLIER">Supplier</option>
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<AuditResponse>
      title="Audit Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/audits/new")}
      columns={columns}
      rows={listQuery.data?.content}
      getRowId={(a) => a.id}
      onRowClick={(a) => router.push(`/audits/${a.id}`)}
      rowActions={(a) => <Button asChild variant="outline" size="sm"><Link href={`/audits/${a.id}`}>View</Link></Button>}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No audits found"
      errorText="Failed to load audits"
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
