"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ModuleListPage, type Column, type SortDirection } from "@/components/common/ModuleListPage";
import { ProgressBar, TrainingStatusBadge } from "@/components/training/TrainingBadges";
import { useTrainingAssignments, useTrainingList } from "@/hooks/useTraining";
import { AUDIENCE_LABELS, FREQUENCY_LABELS, type TrainingAudience, type TrainingFrequency, type TrainingResponse } from "@/types/training";

const AUDIENCES = Object.keys(AUDIENCE_LABELS) as TrainingAudience[];
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as TrainingFrequency[];

export default function TrainingPage() {
  const router = useRouter();
  const [audience, setAudience] = useState<TrainingAudience | "">("");
  const [frequency, setFrequency] = useState<TrainingFrequency | "">("");
  const [completion, setCompletion] = useState<"LOW" | "MEDIUM" | "HIGH" | "">("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const query = useTrainingList({ audience, frequency, completion, page, size: 10, sort: `${sortField},${sortDirection}` });
  const rows = (query.data?.content ?? []).filter((t) => (!frequency || t.requiredFrequency === frequency));

  const columns: Column<TrainingResponse>[] = [
    { key: "title", header: "Training Program", sortable: true, render: (t) => <span className="font-medium">{t.title}</span> },
    { key: "intendedAudience", header: "Intended Audience", render: (t) => AUDIENCE_LABELS[t.intendedAudience] },
    { key: "requiredFrequency", header: "Required Frequency", hideOnMobile: true, render: (t) => FREQUENCY_LABELS[t.requiredFrequency] },
    { key: "assignmentCount", header: "Assignment Count", hideOnMobile: true, render: (t) => <TrainingMetrics id={t.id} mode="count" /> },
    { key: "completion", header: "Completion %", render: (t) => <TrainingMetrics id={t.id} mode="completion" /> },
    { key: "status", header: "Status", render: (t) => <TrainingStatusBadge training={t} /> },
  ];

  const filterBar = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="space-y-1.5"><Label>Audience</Label><Select value={audience} onChange={(e) => setAudience(e.target.value as TrainingAudience | "")}><option value="">All audiences</option>{AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>)}</Select></div>
      <div className="space-y-1.5"><Label>Frequency</Label><Select value={frequency} onChange={(e) => setFrequency(e.target.value as TrainingFrequency | "")}><option value="">All frequencies</option>{FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}</Select></div>
      <div className="space-y-1.5"><Label>Completion %</Label><Select value={completion} onChange={(e) => setCompletion(e.target.value as typeof completion)}><option value="">All completion bands</option><option value="LOW">Below 60%</option><option value="MEDIUM">60-89%</option><option value="HIGH">90%+</option></Select></div>
    </div>
  );

  return (
    <ModuleListPage
      title="Training Management"
      filterBar={filterBar}
      createLabel="Create New"
      onCreate={() => router.push("/training/new")}
      toolbarExtra={<Button asChild variant="outline"><Link href="/my-trainings">My Trainings</Link></Button>}
      columns={columns}
      rows={rows}
      getRowId={(t) => t.id}
      onRowClick={(t) => router.push(`/training/${t.id}`)}
      rowActions={(t) => <Button asChild size="sm" variant="outline"><Link href={`/training/${t.id}`}>View</Link></Button>}
      isLoading={query.isLoading}
      isError={query.isError}
      emptyText="No training programs found"
      errorText="Failed to load training programs"
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

function TrainingMetrics({ id, mode }: { id: number; mode: "count" | "completion" }) {
  const assignments = useTrainingAssignments(id);
  const rows = assignments.data ?? [];
  const completed = rows.filter((a) => a.status === "COMPLETED").length;
  const pct = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  if (mode === "count") return <span>{rows.length}</span>;
  return <div className="min-w-28"><div className="mb-1 text-label">{pct}%</div><ProgressBar value={pct} /></div>;
}
