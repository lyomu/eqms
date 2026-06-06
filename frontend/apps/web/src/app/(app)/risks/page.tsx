"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRiskList } from "@/hooks/useRisk";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { RiskStatusBadge } from "@/components/risks/RiskStatusBadge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  RISK_STATUS_LABELS,
  riskScoreClass,
  type RiskCategory,
  type RiskResponse,
  type RiskStatus,
} from "@/types/risk";

const ALL_STATUSES = Object.keys(RISK_STATUS_LABELS) as RiskStatus[];
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as RiskCategory[];

export default function RisksListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RiskStatus | "">("");
  const [category, setCategory] = useState<RiskCategory | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const listQuery = useRiskList({ status, category, page, size: 10, sort: `${sortField},${sortDirection}` });

  function onSortChange(field: string, direction: SortDirection) { setSortField(field); setSortDirection(direction); setPage(0); }

  const columns: Column<RiskResponse>[] = [
    { key: "riskNo", header: "Risk No.", sortable: true, render: (r) => <span className="font-medium">{r.riskNo}</span> },
    { key: "title", header: "Title", sortable: true, render: (r) => <span className="truncate">{r.title}</span> },
    { key: "category", header: "Category", hideOnMobile: true, render: (r) => CATEGORY_LABELS[r.category] },
    { key: "riskScore", header: "Score", sortable: true, render: (r) => (
      <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium", riskScoreClass(r.riskScore))}>{r.riskScore ?? "—"}</span>
    ) },
    { key: "status", header: "Status", sortable: true, render: (r) => <RiskStatusBadge status={r.status} /> },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as RiskStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>{ALL_STATUSES.map((s) => <option key={s} value={s}>{RISK_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="f-cat">Category</Label>
        <Select id="f-cat" value={category} onChange={(e) => { setCategory(e.target.value as RiskCategory | ""); setPage(0); }}>
          <option value="">All categories</option>{ALL_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<RiskResponse>
      title="Risk Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/risks/new")}
      columns={columns}
      rows={listQuery.data?.content}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(`/risks/${r.id}`)}
      rowActions={(r) => <Button asChild variant="outline" size="sm"><Link href={`/risks/${r.id}`}>View</Link></Button>}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No risks found"
      errorText="Failed to load risks"
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
