"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProductList } from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import {
  DOSAGE_FORM_LABELS,
  PRODUCT_STATUS_LABELS,
  type DosageForm,
  type ProductResponse,
  type ProductStatus,
} from "@/types/product";

const ALL_STATUSES = Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[];
const ALL_FORMS = Object.keys(DOSAGE_FORM_LABELS) as DosageForm[];

export default function ProductsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [form, setForm] = useState<DosageForm | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const usersQuery = useUsers();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useProductList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (form) r = r.filter((p) => p.dosageForm === form);
    return r;
  }, [listQuery.data, form]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<ProductResponse>[] = [
    { key: "productCode", header: "Code", sortable: true, render: (p) => <span className="font-medium">{p.productCode}</span> },
    { key: "name", header: "Name", sortable: true, render: (p) => <span className="truncate">{p.name}</span> },
    { key: "dosageForm", header: "Form", hideOnMobile: true, render: (p) => DOSAGE_FORM_LABELS[p.dosageForm] },
    { key: "strength", header: "Strength", hideOnMobile: true, render: (p) => p.strength || "—" },
    { key: "status", header: "Status", sortable: true, render: (p) => <ProductStatusBadge status={p.status} /> },
    { key: "owner", header: "Owner", hideOnMobile: true, render: (p) => userName.get(p.createdBy ?? -1) ?? (p.createdBy ? `User #${p.createdBy}` : "—") },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as ProductStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-form">Dosage form</Label>
        <Select id="f-form" value={form} onChange={(e) => setForm(e.target.value as DosageForm | "")}>
          <option value="">All forms</option>
          {ALL_FORMS.map((f) => <option key={f} value={f}>{DOSAGE_FORM_LABELS[f]}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<ProductResponse>
      title="Product Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/products/new")}
      columns={columns}
      rows={rows}
      getRowId={(p) => p.id}
      onRowClick={(p) => router.push(`/products/${p.id}`)}
      rowActions={(p) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/products/${p.id}`}>View</Link></Button>
          {p.status === "DRAFT" && <Button asChild variant="ghost" size="sm"><Link href={`/products/${p.id}/edit`}>Edit</Link></Button>}
        </div>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No products found"
      errorText="Failed to load products"
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
