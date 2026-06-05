"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBatchList } from "@/hooks/useBatch";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { BatchStatusBadge } from "@/components/batch/BatchStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { BATCH_STATUS_LABELS, type BatchRecordResponse, type BatchStatus } from "@/types/batch";

const ALL_STATUSES = Object.keys(BATCH_STATUS_LABELS) as BatchStatus[];

export default function BatchRecordsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BatchStatus | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const listQuery = useBatchList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<BatchRecordResponse>[] = [
    { key: "batchNo", header: "Batch No.", sortable: true, render: (b) => <span className="font-medium">{b.batchNo}</span> },
    { key: "productCode", header: "Product", sortable: true, render: (b) => b.productCode },
    { key: "batchSize", header: "Size", hideOnMobile: true, render: (b) => `${b.batchSize} ${b.unit}` },
    { key: "status", header: "Status", sortable: true, render: (b) => <BatchStatusBadge status={b.status} /> },
    { key: "manufacturingStartDate", header: "Mfg Start", sortable: true, hideOnMobile: true, render: (b) => formatDate(b.manufacturingStartDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as BatchStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{BATCH_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<BatchRecordResponse>
      title="Electronic Batch Records"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/batch-records/new")}
      columns={columns}
      rows={listQuery.data?.content}
      getRowId={(b) => b.id}
      onRowClick={(b) => router.push(`/batch-records/${b.id}`)}
      rowActions={(b) => (
        <Button asChild variant="outline" size="sm"><Link href={`/batch-records/${b.id}`}>View</Link></Button>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No batch records found"
      errorText="Failed to load batch records"
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
