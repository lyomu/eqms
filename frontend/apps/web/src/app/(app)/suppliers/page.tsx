"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { SupplierStatusBadge, SupplierTypeBadge } from "@/components/suppliers/SupplierBadges";
import { useSupplierList } from "@/hooks/useSuppliers";
import { SUPPLIER_STATUS_LABELS, SUPPLIER_TYPE_LABELS, type SupplierResponse, type SupplierStatus, type SupplierType } from "@/types/supplier";

const STATUSES = Object.keys(SUPPLIER_STATUS_LABELS) as SupplierStatus[];
const TYPES = Object.keys(SUPPLIER_TYPE_LABELS) as SupplierType[];

export default function SuppliersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SupplierStatus | "">("");
  const [type, setType] = useState<SupplierType | "">("");
  const [certStatus, setCertStatus] = useState<"CERTIFIED" | "EXPIRED" | "PENDING" | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const query = useSupplierList({ status, type, certStatus, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = (query.data?.content ?? []).filter((s) => (!type || s.supplierType === type));
  const columns: Column<SupplierResponse>[] = [
    { key: "supplierCode", header: "Supplier Code", sortable: true, render: (s) => <span className="font-medium">{s.supplierCode}</span> },
    { key: "supplierName", header: "Name", sortable: true, render: (s) => s.supplierName },
    { key: "supplierType", header: "Type", hideOnMobile: true, render: (s) => <SupplierTypeBadge type={s.supplierType} /> },
    { key: "status", header: "Status", sortable: true, render: (s) => <SupplierStatusBadge status={s.status} /> },
    { key: "contactPerson", header: "Contact", hideOnMobile: true, render: (s) => s.contactPerson ?? "Unassigned" },
    { key: "location", header: "Location", hideOnMobile: true, render: (s) => s.location },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="supplier-type">Type</Label>
        <Select id="supplier-type" value={type} onChange={(e) => { setType(e.target.value as SupplierType | ""); setPage(0); }}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{SUPPLIER_TYPE_LABELS[t]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="supplier-status">Status</Label>
        <Select id="supplier-status" value={status} onChange={(e) => { setStatus(e.target.value as SupplierStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{SUPPLIER_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cert-status">Certification Status</Label>
        <Select id="cert-status" value={certStatus} onChange={(e) => setCertStatus(e.target.value as typeof certStatus)}>
          <option value="">All certifications</option>
          <option value="CERTIFIED">Certified</option>
          <option value="EXPIRED">Expired</option>
          <option value="PENDING">Pending</option>
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage
      title="Supplier Quality"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/suppliers/new")}
      columns={columns}
      rows={rows}
      getRowId={(s) => s.id}
      onRowClick={(s) => router.push(`/suppliers/${s.id}`)}
      rowActions={(s) => <Button asChild size="sm" variant="outline"><Link href={`/suppliers/${s.id}`}>View</Link></Button>}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText="No suppliers found"
      errorText="Failed to load suppliers"
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={(f, d) => { setSortField(f); setSortDirection(d); setPage(0); }}
      page={query.data?.page ?? 0}
      totalPages={query.data?.totalPages ?? 0}
      totalElements={query.data?.totalElements ?? 0}
      onPageChange={setPage}
    />
  );
}
