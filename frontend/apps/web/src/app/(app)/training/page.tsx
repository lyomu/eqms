"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FolderArchive,
  GraduationCap,
  Grid2X2,
  Search,
  Settings,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ProgressBar, TrainingStatusBadge } from "@/components/training/TrainingBadges";
import { useTrainingAssignments, useTrainingList } from "@/hooks/useTraining";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { exportRows } from "@/lib/export";
import { AUDIENCE_LABELS, FREQUENCY_LABELS, type TrainingAudience, type TrainingFrequency, type TrainingResponse } from "@/types/training";

const AUDIENCES = Object.keys(AUDIENCE_LABELS) as TrainingAudience[];
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as TrainingFrequency[];
const TRAINING_TYPES = ["Document Training", "Classroom", "Practical", "Assessment", "SOP Review"];

type SortDirection = "asc" | "desc";
type SortField = "trainingCode" | "title" | "type" | "start" | "release" | "status";
type TabKey = "open" | "overdue" | "today" | "tomorrow" | "completed" | "unassigned";
type ViewMode = "list" | "setup" | "calendar" | "records" | "matrix";

export default function TrainingPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [audience, setAudience] = useState<TrainingAudience | "">("");
  const [frequency, setFrequency] = useState<TrainingFrequency | "">("");
  const [type, setType] = useState("");
  const [dateRange, setDateRange] = useState(defaultDateRange());
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("open");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>("trainingCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [view, setView] = useState<ViewMode>("list");
  const query = useTrainingList({ audience, frequency, page, size, sort: "createdAt,desc" });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data?.content ?? [])
      .filter((training) => (!frequency || training.requiredFrequency === frequency))
      .filter((training) => {
        if (!type) return true;
        return training.trainingType === type;
      })
      .filter((training) => {
        if (!term) return true;
        return [
          training.trainingCode,
          training.title,
          training.trainingType,
          training.mainTrainerName,
          featureSummary(training),
          training.internalDocuments.join(" "),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .filter((training) => matchesTab(training, tab))
      .sort((a, b) => compareTraining(a, b, sortField, sortDirection));
  }, [frequency, query.data?.content, search, sortDirection, sortField, tab, type]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function clearFilters() {
    setAudience("");
    setFrequency("");
    setType("");
    setDateRange(defaultDateRange());
    setSearch("");
    setTab("open");
    setPage(0);
  }

  function exportTraining(format: "csv" | "xls") {
    exportRows(
      "training-list",
      ["Number", "Title", "Type", "Trainers", "Features", "Start Date", "Release Date", "Status"],
      rows.map((training) => [
        training.trainingCode,
        training.title,
        training.trainingType ?? "",
        trainerSummary(training),
        featureSummary(training),
        formatDate(training.startAt),
        training.releaseMode === "Scheduled" ? formatDate(training.releaseAt) : training.releaseMode ?? "",
        training.active ? "Active" : "Inactive",
      ]),
      format
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/70 px-2 py-2">
        <ActionButton href="/" icon={<ArrowLeft className="h-4 w-4" />} label="Go Back" />
        <ActionButton href="/training/new" active icon={<GraduationCap className="h-4 w-4" />} label="New Training" />
        <ActionButton icon={<Timer className="h-4 w-4" />} label="Action Required" active={view === "list" && tab === "overdue"} onClick={() => { setView("list"); setTab("overdue"); }} />
        <ActionButton href="/my-trainings" icon={<FolderArchive className="h-4 w-4" />} label="My Training" />
        <ActionButton icon={<FolderArchive className="h-4 w-4" />} label="All Training" active={view === "list" && tab === "open"} onClick={() => { setView("list"); setTab("open"); }} />
        <ActionButton icon={<Settings className="h-4 w-4" />} label="Set-Up" active={view === "setup"} onClick={() => setView("setup")} />
        <ActionButton icon={<CalendarDays className="h-4 w-4" />} label="Calendar" active={view === "calendar"} onClick={() => setView("calendar")} />
        <ActionButton icon={<ClipboardCheck className="h-4 w-4" />} label="Training Record" active={view === "records"} onClick={() => setView("records")} />
        <ActionButton icon={<Grid2X2 className="h-4 w-4" />} label="Training Matrix" active={view === "matrix"} onClick={() => setView("matrix")} />
        <ActionButton icon={<Search className="h-4 w-4" />} label="Search" onClick={() => searchRef.current?.focus()} />
      </div>

      <section className="rounded-md bg-muted/40 p-3">
        <div className="mb-4 flex flex-wrap gap-2">
          <TrainingTab active={tab === "open"} label={`All Open (${rows.length})`} onClick={() => setTab("open")} danger />
          <TrainingTab active={tab === "overdue"} label="Overdue (0)" onClick={() => setTab("overdue")} />
          <TrainingTab active={tab === "today"} label="Due Today (0)" onClick={() => setTab("today")} />
          <TrainingTab active={tab === "tomorrow"} label="Due Tomorrow (0)" onClick={() => setTab("tomorrow")} />
          <TrainingTab active={tab === "completed"} label="Completed (0)" onClick={() => setTab("completed")} />
          <TrainingTab active={tab === "unassigned"} label="Unassigned (0)" onClick={() => setTab("unassigned")} />
        </div>

        <div className="rounded-sm bg-muted p-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_480px_auto]">
            <div className="space-y-1.5">
              <Label>Type:</Label>
              <Select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">All</option>
                {TRAINING_TYPES.map((trainingType) => <option key={trainingType} value={trainingType}>{trainingType}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date Range:</Label>
              <div className="flex">
                <Input value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="rounded-r-none border-border bg-background" />
                <Button type="button" variant="outline" className="rounded-l-none border-l-0"><CalendarDays className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" className="bg-success text-white hover:bg-success/90">Find</Button>
              <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label>Show Entries:</Label>
            <Select value={String(size)} onChange={(event) => setSize(Number(event.target.value))} className="w-24">
              {[10, 25, 50, 100].map((entrySize) => <option key={entrySize} value={entrySize}>{entrySize}</option>)}
            </Select>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => exportTraining("csv")} className="bg-success text-white hover:bg-success/90"><Download className="h-4 w-4" />CSV</Button>
            <Button type="button" onClick={() => exportTraining("xls")} className="bg-success text-white hover:bg-success/90"><FileSpreadsheet className="h-4 w-4" />Excel</Button>
            <Label htmlFor="training-search">Search:</Label>
            <Input ref={searchRef} id="training-search" value={search} onChange={(event) => setSearch(event.target.value)} className="w-60 border-border bg-background" />
          </div>
        </div>

        {view === "setup" ? <TrainingSetupView /> : null}
        {view === "calendar" ? <TrainingCalendarView rows={rows} /> : null}
        {view === "records" ? <TrainingRecordsView rows={rows} /> : null}
        {view === "matrix" ? <TrainingMatrixView rows={rows} /> : null}

        {view === "list" ? <div className="mt-4 overflow-hidden rounded-sm border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body">
              <thead className="bg-success/60">
                <tr className="text-left">
                  <HeaderCell label="Number" field="trainingCode" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
                  <HeaderCell label="Title" field="title" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
                  <HeaderCell label="Type" field="type" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
                  <th className="px-3 py-2 font-semibold">Trainees</th>
                  <th className="px-3 py-2 font-semibold">Trainers</th>
                  <th className="px-3 py-2 font-semibold">Features</th>
                  <HeaderCell label="Start Date" field="start" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
                  <HeaderCell label="Release Date" field="release" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
                  <HeaderCell label="Status" field="status" sortField={sortField} sortDirection={sortDirection} onSort={toggleSort} />
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Loading training records...</td></tr>
                ) : query.isError ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-error">Failed to load training records.</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No record found</td></tr>
                ) : (
                  rows.map((training) => (
                    <TrainingRow key={training.id} training={training} onView={() => router.push(`/training/${training.id}`)} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-3">
            <p className="text-body font-semibold">
              Showing {rows.length ? page * size + 1 : 0} to {page * size + rows.length} of {query.data?.totalElements ?? 0} entries
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page <= 0}>First</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 0}><ChevronLeft className="h-4 w-4" />Previous</Button>
              <Button size="sm" className="bg-success text-white hover:bg-success/90">{page + 1}</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page + 1 >= (query.data?.totalPages ?? 0)}>Next<ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max((query.data?.totalPages ?? 1) - 1, 0))} disabled={page + 1 >= (query.data?.totalPages ?? 0)}>Last</Button>
            </div>
          </div>
        </div> : null}
      </section>
    </div>
  );
}

function ActionButton({ href, icon, label, active = false, onClick }: { href?: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  const className = cn("h-9 bg-background px-3 text-muted-foreground shadow-sm hover:bg-accent", active && "bg-success text-white hover:bg-success/90");
  const content = <>{icon}{label}</>;
  if (href) {
    return <Button asChild size="sm" variant="outline" className={className}><Link href={href}>{content}</Link></Button>;
  }
  return <Button type="button" size="sm" variant="outline" onClick={onClick} className={className}>{content}</Button>;
}

function TrainingTab({ label, active, danger = false, onClick }: { label: string; active: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-body font-semibold text-brand-secondary hover:bg-background",
        active && "bg-success text-white hover:bg-success/90",
        active && danger && "bg-error text-white hover:bg-error/90"
      )}
    >
      {label}
    </button>
  );
}

function HeaderCell({ label, field, sortField, sortDirection, onSort }: { label: string; field: SortField; sortField: SortField; sortDirection: SortDirection; onSort: (field: SortField) => void }) {
  const Icon = sortField === field ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-3 py-2 font-semibold">
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-2">
        {label}
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </th>
  );
}

function TrainingRow({ training, onView }: { training: TrainingResponse; onView: () => void }) {
  return (
    <tr className="border-t border-border hover:bg-success/5">
      <td className="px-3 py-3 font-semibold">{training.trainingCode}</td>
      <td className="px-3 py-3">{training.title}</td>
      <td className="px-3 py-3">{training.trainingType ?? FREQUENCY_LABELS[training.requiredFrequency]}</td>
      <td className="px-3 py-3"><TrainingMetrics id={training.id} mode="count" /></td>
      <td className="px-3 py-3">{trainerSummary(training)}</td>
      <td className="px-3 py-3">{featureSummary(training)}</td>
      <td className="px-3 py-3">{formatDate(training.startAt)}</td>
      <td className="px-3 py-3">{training.releaseMode === "Scheduled" ? formatDate(training.releaseAt) : training.releaseMode ?? "-"}</td>
      <td className="px-3 py-3"><TrainingStatusBadge training={training} /></td>
      <td className="px-3 py-3 text-right"><Button size="sm" variant="outline" onClick={onView}>View</Button></td>
    </tr>
  );
}

function TrainingMetrics({ id, mode }: { id: number; mode: "count" | "completion" }) {
  const assignments = useTrainingAssignments(id);
  const rows = assignments.data ?? [];
  const completed = rows.filter((assignment) => assignment.status === "COMPLETED").length;
  const pct = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  if (mode === "count") return <span>{rows.length || "-"}</span>;
  return <div className="min-w-28"><div className="mb-1 text-label">{pct}%</div><ProgressBar value={pct} /></div>;
}

function matchesTab(training: TrainingResponse, tab: TabKey) {
  if (tab === "completed") return !training.active;
  if (tab === "unassigned") return training.active;
  if (tab === "overdue") return isBeforeToday(training.startAt) && training.active;
  if (tab === "today") return isSameDay(training.startAt, new Date());
  if (tab === "tomorrow") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(training.startAt, tomorrow);
  }
  return training.active;
}

function compareTraining(a: TrainingResponse, b: TrainingResponse, field: SortField, direction: SortDirection) {
  const values: Record<SortField, [string, string]> = {
    trainingCode: [a.trainingCode, b.trainingCode],
    title: [a.title, b.title],
    type: [a.trainingType ?? "", b.trainingType ?? ""],
    start: [a.startAt ?? "", b.startAt ?? ""],
    release: [a.releaseAt ?? a.releaseMode ?? "", b.releaseAt ?? b.releaseMode ?? ""],
    status: [a.active ? "Active" : "Inactive", b.active ? "Active" : "Inactive"],
  };
  const [left, right] = values[field];
  const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function trainerSummary(training: TrainingResponse) {
  return [training.mainTrainerName, ...training.additionalTrainers].filter(Boolean).join(", ") || "-";
}

function featureSummary(training: TrainingResponse) {
  const features = [training.occurrence, training.internalDocuments.length ? `${training.internalDocuments.length} document(s)` : null, training.sessions.length ? `${training.sessions.length} session(s)` : null].filter(Boolean);
  return features.join(", ") || "-";
}

function defaultDateRange() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return `${formatDateInput(today)} to ${formatDateInput(tomorrow)}`;
}

function formatDateInput(date: Date) {
  return formatDate(date.toISOString()).replaceAll("/", "-");
}

function TrainingSetupView() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SetupPanel title="Training Types" rows={TRAINING_TYPES} />
      <SetupPanel title="Audiences" rows={AUDIENCES.map((key) => AUDIENCE_LABELS[key])} />
      <SetupPanel title="Recurrence Rules" rows={FREQUENCIES.map((key) => FREQUENCY_LABELS[key])} />
    </div>
  );
}

function SetupPanel({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="rounded-md border border-border bg-background">
      <div className="border-b border-border bg-success/10 px-4 py-3 font-semibold">{title}</div>
      <div className="divide-y divide-border">
        {rows.map((row) => <div key={row} className="px-4 py-2 text-body">{row}</div>)}
      </div>
    </section>
  );
}

function TrainingCalendarView({ rows }: { rows: TrainingResponse[] }) {
  const dated = rows
    .flatMap((training) => {
      const dates = training.sessions.length
        ? training.sessions.map((session) => ({ date: session.startAt, label: `Session ${session.sessionIndex}` }))
        : [{ date: training.startAt, label: training.occurrence ?? "Training" }];
      return dates.map((item) => ({ training, ...item })).filter((item) => item.date);
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <div className="mt-4 overflow-hidden rounded-sm border border-border bg-background">
      <table className="w-full text-body">
        <thead className="bg-success/30 text-left"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Program</th><th className="px-3 py-2">Session</th><th className="px-3 py-2">Trainer</th></tr></thead>
        <tbody>
          {dated.length ? dated.map((item) => (
            <tr key={`${item.training.id}-${item.label}-${item.date}`} className="border-t border-border">
              <td className="px-3 py-2">{formatDate(item.date)}</td>
              <td className="px-3 py-2 font-semibold">{item.training.trainingCode} - {item.training.title}</td>
              <td className="px-3 py-2">{item.label}</td>
              <td className="px-3 py-2">{trainerSummary(item.training)}</td>
            </tr>
          )) : <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No scheduled training dates.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TrainingRecordsView({ rows }: { rows: TrainingResponse[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-sm border border-border bg-background">
      <table className="w-full text-body">
        <thead className="bg-success/30 text-left"><tr><th className="px-3 py-2">Program</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Trainees</th><th className="px-3 py-2">Completion</th><th className="px-3 py-2">Evidence</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((training) => <TrainingRecordRow key={training.id} training={training} />) : <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No training records.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TrainingRecordRow({ training }: { training: TrainingResponse }) {
  const assignments = useTrainingAssignments(training.id);
  const rows = assignments.data ?? [];
  const completed = rows.filter((assignment) => assignment.status === "COMPLETED");
  const pct = rows.length ? Math.round((completed.length / rows.length) * 100) : 0;
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-semibold">{training.trainingCode}</td>
      <td className="px-3 py-2">{training.title}</td>
      <td className="px-3 py-2">{rows.length}</td>
      <td className="px-3 py-2"><div className="max-w-36"><ProgressBar value={pct} /></div></td>
      <td className="px-3 py-2">{completed.map((item) => item.completionEvidence).filter(Boolean).join("; ") || "-"}</td>
    </tr>
  );
}

function TrainingMatrixView({ rows }: { rows: TrainingResponse[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-sm border border-border bg-background">
      <table className="w-full text-body">
        <thead className="bg-success/30 text-left"><tr><th className="px-3 py-2">Program</th><th className="px-3 py-2">Audience</th><th className="px-3 py-2">Frequency</th><th className="px-3 py-2">Assignments</th><th className="px-3 py-2">Status</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((training) => <TrainingMatrixRow key={training.id} training={training} />) : <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No matrix data.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TrainingMatrixRow({ training }: { training: TrainingResponse }) {
  const assignments = useTrainingAssignments(training.id);
  const rows = assignments.data ?? [];
  const overdue = rows.filter((assignment) => assignment.status !== "COMPLETED" && assignment.dueDate && new Date(assignment.dueDate) < new Date()).length;
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-semibold">{training.trainingCode}</td>
      <td className="px-3 py-2">{AUDIENCE_LABELS[training.intendedAudience]}</td>
      <td className="px-3 py-2">{FREQUENCY_LABELS[training.requiredFrequency]}</td>
      <td className="px-3 py-2">{rows.length}</td>
      <td className="px-3 py-2">{overdue ? <span className="font-semibold text-error">{overdue} overdue</span> : "Current"}</td>
    </tr>
  );
}

function isSameDay(value: string | null, date: Date) {
  if (!value) return false;
  const d = new Date(value);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
}

function isBeforeToday(value: string | null) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value) < today;
}
