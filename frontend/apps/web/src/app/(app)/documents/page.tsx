"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDocumentList, useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { StatusBadge, DOCUMENT_STATUS_LABELS } from "@/components/documents/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { DocumentResponse, DocumentStatus } from "@/types/documents";
import { DOCUMENT_TYPE_LABELS } from "@/types/documents";

const ALL_STATUSES = Object.keys(DOCUMENT_STATUS_LABELS) as DocumentStatus[];

export default function DocumentsListPage() {
  const router = useRouter();

  // Server-side: status filter + sort + pagination.
  const [status, setStatus] = useState<DocumentStatus | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Client-side refinements over the loaded page (backend list filters by status only).
  const [ownerId, setOwnerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const usersQuery = useUsers();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useDocumentList({
    status,
    page,
    size: 10,
    sort: `${sortField},${sortDirection}`,
  });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (ownerId) r = r.filter((d) => String(d.createdBy ?? "") === ownerId);
    if (dateFrom) r = r.filter((d) => d.updatedAt >= dateFrom);
    if (dateTo) r = r.filter((d) => d.updatedAt <= `${dateTo}T23:59:59Z`);
    return r;
  }, [listQuery.data, ownerId, dateFrom, dateTo]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<DocumentResponse>[] = [
    {
      key: "documentNumber",
      header: "Doc Number",
      sortable: true,
      render: (d) => <span className="font-medium">{d.documentNumber}</span>,
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (d) => (
        <div className="min-w-0">
          <p className="truncate">{d.title}</p>
          <p className="text-label text-muted-foreground">{DOCUMENT_TYPE_LABELS[d.type]}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: "owner",
      header: "Owner",
      hideOnMobile: true,
      render: (d) => userName.get(d.createdBy ?? -1) ?? (d.createdBy ? `User #${d.createdBy}` : "—"),
    },
    {
      key: "updatedAt",
      header: "Modified",
      sortable: true,
      hideOnMobile: true,
      render: (d) => formatDate(d.updatedAt),
    },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select
          id="f-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as DocumentStatus | "");
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {DOCUMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-owner">Owner</Label>
        <Select id="f-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">All owners</option>
          {usersQuery.data?.map((u) => (
            <option key={u.id} value={String(u.id)}>
              {u.fullName}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-from">Modified from</Label>
        <Input id="f-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-to">Modified to</Label>
        <Input id="f-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>
    </div>
  );

  return (
    <ModuleListPage<DocumentResponse>
      title="Document Control"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/documents/new")}
      columns={columns}
      rows={rows}
      getRowId={(d) => d.id}
      onRowClick={(d) => router.push(`/documents/${d.id}`)}
      rowActions={(d) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/documents/${d.id}`}>View</Link>
          </Button>
          {d.status === "DRAFT" && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/documents/${d.id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No documents found"
      errorText="Failed to load documents"
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
