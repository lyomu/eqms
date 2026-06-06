"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { ReviewStatusBadge } from "@/components/management-reviews/ManagementReviewBadges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useManagementReviewList } from "@/hooks/useManagementReviews";
import { formatDate } from "@/lib/format";
import { MR_STATUS_LABELS, type ManagementReviewResponse, type MrStatus } from "@/types/management-review";

export default function ManagementReviewsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MrStatus | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const query = useManagementReviewList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });
  const columns: Column<ManagementReviewResponse>[] = [
    { key: "reviewNo", header: "Review Number", sortable: true, render: (r) => <span className="font-medium">{r.reviewNo}</span> },
    { key: "reviewDate", header: "Review Date", render: (r) => formatDate(r.reviewDate) },
    { key: "participants", header: "Participants", hideOnMobile: true, render: (r) => r.participants ?? "-" },
    { key: "scope", header: "Scope", hideOnMobile: true, render: (r) => <span className="line-clamp-1">{r.scope ?? "-"}</span> },
    { key: "status", header: "Status", render: (r) => <ReviewStatusBadge status={r.status} /> },
  ];
  const filterBar = <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><div className="space-y-1.5"><Label>Status</Label><Select value={status} onChange={(e) => setStatus(e.target.value as MrStatus | "")}><option value="">All statuses</option>{Object.entries(MR_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div><div className="space-y-1.5"><Label>Date range</Label><Select><option>All dates</option><option>This quarter</option><option>This year</option></Select></div></div>;
  return <ModuleListPage title="Management Reviews" filterBar={filterBar} createLabel="Create New" onCreate={() => router.push("/management-reviews/new")} columns={columns} rows={query.data?.content} getRowId={(r) => r.id} onRowClick={(r) => router.push(`/management-reviews/${r.id}`)} rowActions={(r) => <Button asChild size="sm" variant="outline"><Link href={`/management-reviews/${r.id}`}>View</Link></Button>} isLoading={query.isLoading} isError={query.isError} emptyText="No management reviews found" errorText="Failed to load management reviews" sortField={sortField} sortDirection={sortDirection} onSortChange={(f, d) => { setSortField(f); setSortDirection(d); }} page={query.data?.page ?? 0} totalPages={query.data?.totalPages ?? 0} totalElements={query.data?.totalElements ?? 0} onPageChange={setPage} />;
}
