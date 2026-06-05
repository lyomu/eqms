"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useChangeList } from "@/hooks/useChangeControl";
import { useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { ChangeStatusBadge } from "@/components/change-control/ChangeStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { CHANGE_STATUS_LABELS, type ChangeControlResponse, type ChangeStatus } from "@/types/change-control";

const ALL_STATUSES = Object.keys(CHANGE_STATUS_LABELS) as ChangeStatus[];

export default function ChangeControlListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ChangeStatus | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [ownerId, setOwnerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const usersQuery = useUsers();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useChangeList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (ownerId) r = r.filter((c) => String(c.createdBy ?? "") === ownerId);
    if (dateFrom) r = r.filter((c) => c.updatedAt >= dateFrom);
    if (dateTo) r = r.filter((c) => c.updatedAt <= `${dateTo}T23:59:59Z`);
    return r;
  }, [listQuery.data, ownerId, dateFrom, dateTo]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<ChangeControlResponse>[] = [
    {
      key: "changeNumber",
      header: "Change No.",
      sortable: true,
      render: (c) => <span className="font-medium">{c.changeNumber}</span>,
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (c) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">{c.title}</span>
          <Badge variant={c.type === "MAJOR" ? "warning" : "neutral"}>{c.type}</Badge>
        </div>
      ),
    },
    { key: "status", header: "Status", sortable: true, render: (c) => <ChangeStatusBadge status={c.status} /> },
    {
      key: "owner",
      header: "Owner",
      hideOnMobile: true,
      render: (c) => userName.get(c.createdBy ?? -1) ?? (c.createdBy ? `User #${c.createdBy}` : "—"),
    },
    { key: "updatedAt", header: "Modified", sortable: true, hideOnMobile: true, render: (c) => formatDate(c.updatedAt) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select
          id="f-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ChangeStatus | "");
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CHANGE_STATUS_LABELS[s]}
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
    <ModuleListPage<ChangeControlResponse>
      title="Change Control"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/change-control/new")}
      columns={columns}
      rows={rows}
      getRowId={(c) => c.id}
      onRowClick={(c) => router.push(`/change-control/${c.id}`)}
      rowActions={(c) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/change-control/${c.id}`}>View</Link>
        </Button>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No change requests found"
      errorText="Failed to load change requests"
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
