"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDeviationList } from "@/hooks/useDeviation";
import { useUsers } from "@/hooks/useDocuments";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { DeviationStatusBadge } from "@/components/deviations/DeviationStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import {
  DEVIATION_STATUS_LABELS,
  SEVERITY_VARIANT,
  type DeviationResponse,
  type DeviationSeverity,
  type DeviationStatus,
} from "@/types/deviation";

const ALL_STATUSES = Object.keys(DEVIATION_STATUS_LABELS) as DeviationStatus[];
const SEVERITIES: DeviationSeverity[] = ["CRITICAL", "MAJOR", "MINOR"];

export default function DeviationsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DeviationStatus | "">("");
  const [severity, setSeverity] = useState<DeviationSeverity | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const usersQuery = useUsers();
  const userName = useMemo(() => {
    const map = new Map<number, string>();
    usersQuery.data?.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [usersQuery.data]);

  const listQuery = useDeviationList({ status, page, size: 10, sort: `${sortField},${sortDirection}` });

  const rows = useMemo(() => {
    let r = listQuery.data?.content ?? [];
    if (severity) r = r.filter((d) => d.severity === severity);
    return r;
  }, [listQuery.data, severity]);

  function onSortChange(field: string, direction: SortDirection) {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  }

  const columns: Column<DeviationResponse>[] = [
    { key: "deviationNumber", header: "Dev No.", sortable: true, render: (d) => <span className="font-medium">{d.deviationNumber}</span> },
    { key: "title", header: "Title", sortable: true, render: (d) => <span className="truncate">{d.title}</span> },
    { key: "severity", header: "Severity", sortable: true, render: (d) => <Badge variant={SEVERITY_VARIANT[d.severity]}>{d.severity}</Badge> },
    { key: "status", header: "Status", sortable: true, render: (d) => <DeviationStatusBadge status={d.status} /> },
    { key: "owner", header: "Owner", hideOnMobile: true, render: (d) => userName.get(d.createdBy ?? -1) ?? (d.createdBy ? `User #${d.createdBy}` : "—") },
    { key: "occurredDate", header: "Occurred", sortable: true, hideOnMobile: true, render: (d) => formatDate(d.occurredDate) },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="f-status">Status</Label>
        <Select id="f-status" value={status} onChange={(e) => { setStatus(e.target.value as DeviationStatus | ""); setPage(0); }}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{DEVIATION_STATUS_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-severity">Severity</Label>
        <Select id="f-severity" value={severity} onChange={(e) => setSeverity(e.target.value as DeviationSeverity | "")}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <ModuleListPage<DeviationResponse>
      title="Deviations"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/deviations/new")}
      columns={columns}
      rows={rows}
      getRowId={(d) => d.id}
      onRowClick={(d) => router.push(`/deviations/${d.id}`)}
      rowActions={(d) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/deviations/${d.id}`}>View</Link>
        </Button>
      )}
      isLoading={listQuery.isLoading}
      isError={listQuery.isError}
      emptyText="No deviations found"
      errorText="Failed to load deviations"
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
