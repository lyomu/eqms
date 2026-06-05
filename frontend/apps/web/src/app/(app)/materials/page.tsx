"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMaterialList } from "@/hooks/useMaterial";
import { useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { MaterialStatusBadge } from "@/components/materials/MaterialStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import {
  MATERIAL_STATUS_LABELS,
  MATERIAL_TYPE_LABELS,
  UOM_LABELS,
  type MaterialResponse,
  type MaterialStatus,
  type MaterialType,
} from "@/types/material";

const ALL_STATUSES = Object.keys(MATERIAL_STATUS_LABELS) as MaterialStatus[];
const ALL_TYPES = Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[];

export default function MaterialsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MaterialStatus | "">("");
  const [type, setType] = useState<MaterialType | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const usersQuery = useUsers();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useMaterialList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (type) r = r.filter((m) => m.materialType === type);
    return r;
  }, [listQuery.data, type]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<MaterialResponse>[] = [
    { key: "materialCode", header: "Code", sortable: true, render: (m) => <span className="font-medium">{m.materialCode}</span> },
    { key: "name", header: "Name", sortable: true, render: (m) => <span className="truncate">{m.name}</span> },
    { key: "materialType", header: "Type", hideOnMobile: true, render: (m) => <Badge variant="neutral">{MATERIAL_TYPE_LABELS[m.materialType]}</Badge> },
    { key: "unitOfMeasure", header: "UoM", hideOnMobile: true, render: (m) => UOM_LABELS[m.unitOfMeasure] },
    { key: "status", header: "Status", sortable: true, render: (m) => <MaterialStatusBadge status={m.status} /> },
    { key: "owner", header: "Owner", hideOnMobile: true, render: (m) => userName.get(m.createdBy ?? -1) ?? (m.createdBy ? `User #${m.createdBy}` : "—") },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as MaterialStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{MATERIAL_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-type">Type</Label>
        <Select id="f-type" value={type} onChange={(e) => setType(e.target.value as MaterialType | "")}>
          <option value="">All types</option>
          {ALL_TYPES.map((t) => <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<MaterialResponse>
      title="Material Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/materials/new")}
      columns={columns}
      rows={rows}
      getRowId={(m) => m.id}
      onRowClick={(m) => router.push(`/materials/${m.id}`)}
      rowActions={(m) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/materials/${m.id}`}>View</Link></Button>
          {m.status === "DRAFT" && <Button asChild variant="ghost" size="sm"><Link href={`/materials/${m.id}/edit`}>Edit</Link></Button>}
        </div>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No materials found"
      errorText="Failed to load materials"
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
