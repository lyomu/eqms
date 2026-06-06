"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOosList } from "@/hooks/useOos";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { OosStatusBadge } from "@/components/oos/OosStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { OOS_STATUS_LABELS, type OosCaseResponse, type OosStatus } from "@/types/oos";

const ALL_STATUSES = Object.keys(OOS_STATUS_LABELS) as OosStatus[];

export default function OosListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OosStatus | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const listQuery = useOosList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  function onSortChange(field: string, direction: SortDirection) { setSortField(field); setSortDirection(direction); setPage(0); }

  const columns: Column<OosCaseResponse>[] = [
    { key: "oosNo", header: "OOS No.", sortable: true, render: (o) => <span className="font-medium">{o.oosNo}</span> },
    { key: "testMethod", header: "Test Method", render: (o) => o.testMethod || "—" },
    { key: "reportedResult", header: "Result", render: (o) => o.reportedResult },
    { key: "status", header: "Status", sortable: true, render: (o) => <OosStatusBadge status={o.status} /> },
    { key: "reportedDate", header: "Reported", sortable: true, hideOnMobile: true, render: (o) => formatDate(o.reportedDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as OosStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>{ALL_STATUSES.map((s) => <option key={s} value={s}>{OOS_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<OosCaseResponse>
      title="OOS Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/oos/new")}
      columns={columns}
      rows={listQuery.data?.content}
      getRowId={(o) => o.id}
      onRowClick={(o) => router.push(`/oos/${o.id}`)}
      rowActions={(o) => <Button asChild variant="outline" size="sm"><Link href={`/oos/${o.id}`}>View</Link></Button>}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No OOS cases found"
      errorText="Failed to load OOS cases"
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
