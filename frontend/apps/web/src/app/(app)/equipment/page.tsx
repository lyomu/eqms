"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEquipmentList } from "@/hooks/useEquipment";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_TYPES,
  equipmentTypeLabel,
  type EquipmentResponse,
  type EquipmentStatus,
  type EquipmentType,
} from "@/types/equipment";

const ALL_STATUSES = Object.keys(EQUIPMENT_STATUS_LABELS) as EquipmentStatus[];

export default function EquipmentListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<EquipmentStatus | "">("");
  const [type, setType] = useState<EquipmentType | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const listQuery = useEquipmentList({ status, type, page, size: 10, sort: `${sortField},${sortDirection}` });

  function onSortChange(field: string, direction: SortDirection) { setSortField(field); setSortDirection(direction); setPage(0); }

  const columns: Column<EquipmentResponse>[] = [
    { key: "equipmentCode", header: "Code", sortable: true, render: (e) => <span className="font-medium">{e.equipmentCode}</span> },
    { key: "equipmentName", header: "Name", sortable: true, render: (e) => <span className="truncate">{e.equipmentName}</span> },
    { key: "equipmentType", header: "Type", hideOnMobile: true, render: (e) => equipmentTypeLabel(e.equipmentType) },
    { key: "location", header: "Location", hideOnMobile: true, render: (e) => e.location || "—" },
    { key: "status", header: "Status", sortable: true, render: (e) => <EquipmentStatusBadge status={e.status} /> },
    { key: "nextCalibrationDate", header: "Next Cal.", hideOnMobile: true, render: (e) => formatDate(e.nextCalibrationDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as EquipmentStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>{ALL_STATUSES.map((s) => <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="f-type">Type</Label>
        <Select id="f-type" value={type} onChange={(e) => { setType(e.target.value as EquipmentType | ""); setPage(0); }}>
          <option value="">All types</option>{EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{equipmentTypeLabel(t)}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<EquipmentResponse>
      title="Equipment & Calibration"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/equipment/new")}
      columns={columns}
      rows={listQuery.data?.content}
      getRowId={(e) => e.id}
      onRowClick={(e) => router.push(`/equipment/${e.id}`)}
      rowActions={(e) => <Button asChild variant="outline" size="sm"><Link href={`/equipment/${e.id}`}>View</Link></Button>}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No equipment found"
      errorText="Failed to load equipment"
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
