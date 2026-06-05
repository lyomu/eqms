"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCapaList } from "@/hooks/useCapa";
import { useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { CapaStatusBadge } from "@/components/capa/CapaStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import {
  CAPA_SOURCE_LABELS,
  CAPA_STATUS_LABELS,
  type CapaResponse,
  type CapaSource,
  type CapaStatus,
} from "@/types/capa";

const ALL_STATUSES = Object.keys(CAPA_STATUS_LABELS) as CapaStatus[];
const ALL_SOURCES = Object.keys(CAPA_SOURCE_LABELS) as CapaSource[];

export default function CapaListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CapaStatus | "">("");
  const [source, setSource] = useState<CapaSource | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const usersQuery = useUsers();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useCapaList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (source) r = r.filter((c) => c.source === source);
    return r;
  }, [listQuery.data, source]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<CapaResponse>[] = [
    { key: "capaNumber", header: "CAPA No.", sortable: true, render: (c) => <span className="font-medium">{c.capaNumber}</span> },
    { key: "title", header: "Title", sortable: true, render: (c) => <span className="truncate">{c.title}</span> },
    { key: "source", header: "Source", hideOnMobile: true, render: (c) => <Badge variant="neutral">{CAPA_SOURCE_LABELS[c.source]}</Badge> },
    { key: "status", header: "Status", sortable: true, render: (c) => <CapaStatusBadge status={c.status} /> },
    { key: "owner", header: "Owner", hideOnMobile: true, render: (c) => userName.get(c.createdBy ?? -1) ?? (c.createdBy ? `User #${c.createdBy}` : "—") },
    { key: "dueDate", header: "Due", sortable: true, hideOnMobile: true, render: (c) => formatDate(c.dueDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as CapaStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{CAPA_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-source">Source</Label>
        <Select id="f-source" value={source} onChange={(e) => setSource(e.target.value as CapaSource | "")}>
          <option value="">All sources</option>
          {ALL_SOURCES.map((s) => <option key={s} value={s}>{CAPA_SOURCE_LABELS[s]}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<CapaResponse>
      title="CAPA"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/capa/new")}
      columns={columns}
      rows={rows}
      getRowId={(c) => c.id}
      onRowClick={(c) => router.push(`/capa/${c.id}`)}
      rowActions={(c) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/capa/${c.id}`}>View</Link>
        </Button>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No CAPAs found"
      errorText="Failed to load CAPAs"
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
