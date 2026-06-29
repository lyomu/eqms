"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProductList, useProductSummary } from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import {
  PRODUCT_CRITICALITY_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
  type ProductCriticality,
  type ProductResponse,
  type ProductStatus,
} from "@/types/product";

const ALL_STATUSES = Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[];
const ALL_TYPES = Object.keys(PRODUCT_TYPE_LABELS);
const ALL_CRITICALITIES = Object.keys(PRODUCT_CRITICALITY_LABELS) as ProductCriticality[];

export default function ProductsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [productType, setProductType] = useState("");
  const [category, setCategory] = useState("");
  const [criticality, setCriticality] = useState<ProductCriticality | "">("");
  const [specificationStatus, setSpecificationStatus] = useState("");
  const [dueForReview, setDueForReview] = useState(false);
  const [openQualityIssues, setOpenQualityIssues] = useState(false);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const usersQuery = useUsers();
  const summary = useProductSummary();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useProductList({
    status,
    search,
    productType,
    category,
    criticality,
    specificationStatus,
    dueForReview,
    openQualityIssues,
    page,
    size: 10,
    sort: `${sortField},${sortDirection}`,
  });

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<ProductResponse>[] = [
    { key: "productCode", header: "Product Code", sortable: true, render: (p) => <span className="font-medium">{p.productCode}</span> },
    { key: "name", header: "Product Name", sortable: true, render: (p) => <span className="truncate">{p.name}</span> },
    { key: "productType", header: "Product Type", hideOnMobile: true, render: (p) => label(PRODUCT_TYPE_LABELS, p.productType) },
    { key: "category", header: "Category", hideOnMobile: true, render: (p) => p.category || "-" },
    { key: "revision", header: "Version/Revision", hideOnMobile: true, render: (p) => p.revision || "-" },
    { key: "status", header: "Status", sortable: true, render: (p) => <ProductStatusBadge status={p.status} /> },
    { key: "criticality", header: "Criticality", hideOnMobile: true, render: (p) => PRODUCT_CRITICALITY_LABELS[p.criticality] },
    { key: "specificationStatus", header: "Spec Status", hideOnMobile: true, render: (p) => p.specificationStatus || "-" },
    { key: "approvedAt", header: "Approved", hideOnMobile: true, render: (p) => p.approvedAt ? formatDate(p.approvedAt) : "-" },
    { key: "nextReviewDate", header: "Next Review", hideOnMobile: true, render: (p) => p.nextReviewDate ? formatDate(p.nextReviewDate) : "-" },
    { key: "owner", header: "Owner", hideOnMobile: true, render: (p) => userName.get(p.ownerId ?? p.createdBy ?? -1) ?? (p.ownerId ? `User #${p.ownerId}` : "-") },
  ];

  const filterBar = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Summary label="Total Products" value={summary.data?.totalProducts} />
        <Summary label="Active Products" value={summary.data?.activeProducts} />
        <Summary label="Draft Products" value={summary.data?.draftProducts} />
        <Summary label="Under Review" value={summary.data?.underReviewProducts} />
        <Summary label="Obsolete Products" value={summary.data?.obsoleteProducts} />
        <Summary label="Open Quality Issues" value={summary.data?.productsWithOpenQualityIssues} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="f-search">Search</Label>
          <Input id="f-search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Code or name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-type">Product type</Label>
          <Select id="f-type" value={productType} onChange={(e) => { setProductType(e.target.value); setPage(0); }}>
            <option value="">All types</option>
            {ALL_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-category">Category</Label>
          <Input id="f-category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-status">Status</Label>
          <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as ProductStatus | ""); setPage(0); }}>
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-criticality">Criticality</Label>
          <Select id="f-criticality" value={criticality} onChange={(e) => { setCriticality(e.target.value as ProductCriticality | ""); setPage(0); }}>
            <option value="">All criticalities</option>
            {ALL_CRITICALITIES.map((c) => <option key={c} value={c}>{PRODUCT_CRITICALITY_LABELS[c]}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-spec">Specification status</Label>
          <Select id="f-spec" value={specificationStatus} onChange={(e) => { setSpecificationStatus(e.target.value); setPage(0); }}>
            <option value="">All spec statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="OBSOLETE">Obsolete</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 pt-7 text-label">
          <input type="checkbox" checked={dueForReview} onChange={(e) => { setDueForReview(e.target.checked); setPage(0); }} />
          Due for review
        </label>
        <label className="flex items-center gap-2 pt-7 text-label">
          <input type="checkbox" checked={openQualityIssues} onChange={(e) => { setOpenQualityIssues(e.target.checked); setPage(0); }} />
          Open quality issues
        </label>
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
      rows={listQuery.data?.content ?? []}
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

function Summary({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-label text-muted-foreground">{label}</div>
      <div className="text-h3 text-brand-primary">{value ?? "-"}</div>
    </div>
  );
}

function label(labels: Record<string, string>, value?: string | null) {
  return value ? labels[value] ?? value.replace(/_/g, " ") : "-";
}
