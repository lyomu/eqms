"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, ClipboardList, FileText, GraduationCap, UsersRound } from "lucide-react";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { ComplianceChart } from "@/components/training/ComplianceChart";
import { AssignmentStatusBadge, ProgressBar, TrainingStatusBadge } from "@/components/training/TrainingBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { useUsers } from "@/hooks/useDocuments";
import { useTraining, useTrainingAction, useTrainingAssignments, useTrainingCompliance, useTrainingRules, useTrainingTrail } from "@/hooks/useTraining";
import { formatDate } from "@/lib/format";
import { AUDIENCE_LABELS, FREQUENCY_LABELS, type TrainingAssignment, type TrainingRule } from "@/types/training";

type TabKey = "curriculum" | "assignments" | "rules" | "history" | "compliance" | "trail";
type ModalKey = null | "assign" | "rule" | "completion";

const TABS = [
  { key: "curriculum", label: "Curriculum" },
  { key: "assignments", label: "Assignments" },
  { key: "rules", label: "Auto-Rules" },
  { key: "history", label: "Completion History" },
  { key: "compliance", label: "Compliance Status" },
  { key: "trail", label: "Audit Trail" },
];

export default function TrainingDetailPage() {
  const id = Number(useParams().id);
  const training = useTraining(id);
  const assignments = useTrainingAssignments(id);
  const rules = useTrainingRules(id);
  const compliance = useTrainingCompliance();
  const trail = useTrainingTrail(id);
  const users = useUsers();
  const action = useTrainingAction(id);
  const [tab, setTab] = useState<TabKey>("curriculum");
  const [modal, setModal] = useState<ModalKey>(null);
  const userOptions = useMemo(() => users.data?.map((u) => ({ value: String(u.id), label: u.fullName })) ?? [], [users.data]);

  if (training.isLoading) return <LoadingScreen label="Loading training..." />;
  if (training.isError || !training.data) return <ErrorAlert title="Error" message="Failed to load this training program." />;
  const t = training.data;
  const rows = assignments.data ?? [];
  const completed = rows.filter((a) => a.status === "COMPLETED").length;
  const completionPct = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  const parsed = parseTrainingContent(t.content);
  const sessions = sessionRows(parsed.fields);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <div className="text-label text-muted-foreground"><Link href="/training" className="hover:underline">Training</Link> / {t.trainingCode}</div>
          <h1 className="text-h1 text-brand-primary">{t.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2"><TrainingStatusBadge training={t} /><Badge variant="info">{AUDIENCE_LABELS[t.intendedAudience]}</Badge><Badge variant="neutral">{FREQUENCY_LABELS[t.requiredFrequency]}</Badge></div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" disabled>Edit</Button>
          <Button onClick={() => setModal("assign")}>Assign Users</Button>
          <Button variant="outline" onClick={() => setModal("rule")}>Create Auto-Rule</Button>
          <Button variant="outline" onClick={() => setModal("completion")}>Record Completion</Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-4">
          <Field label="Program" value={t.trainingCode} />
          <Field label="Type" value={parsed.fields.Type ?? "Training"} />
          <Field label="Audience" value={AUDIENCE_LABELS[t.intendedAudience]} />
          <Field label="Occurrence" value={parsed.fields.Occurrence ?? FREQUENCY_LABELS[t.requiredFrequency]} />
          <Field label="Release Date" value={parsed.fields["Release Date"] ?? "-"} />
          <Field label="Main Trainer" value={parsed.fields["Main Trainer"] ?? "-"} />
          <Field label="Start" value={parsed.fields.Start ?? parsed.fields["Start 1"] ?? "-"} />
          <Field label="End" value={parsed.fields.End ?? parsed.fields["End 1"] ?? "-"} />
          <Field label="Version" value={`v${t.version}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} /></CardHeader>
        <CardContent>
          {tab === "curriculum" && (
            <div className="space-y-4 text-body">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <DetailPanel icon={<GraduationCap className="h-5 w-5" />} title="Training Setup">
                  <DetailField label="Numbering" value={parsed.fields.Numbering ?? "Training"} />
                  <DetailField label="Type" value={parsed.fields.Type ?? "-"} />
                  <DetailField label="Audience" value={parsed.fields.Audience ?? AUDIENCE_LABELS[t.intendedAudience]} />
                  <DetailField label="Features" value={parsed.fields.Features ?? "-"} />
                </DetailPanel>
                <DetailPanel icon={<CalendarDays className="h-5 w-5" />} title="Schedule">
                  <DetailField label="Occurrence" value={parsed.fields.Occurrence ?? "-"} />
                  <DetailField label="Recurrence" value={parsed.fields.Recurrence ?? FREQUENCY_LABELS[t.requiredFrequency]} />
                  <DetailField label="Completion Date" value={parsed.fields["Completion Date"] ?? "-"} />
                  <DetailField label="Release Date" value={parsed.fields["Release Date"] ?? "-"} />
                </DetailPanel>
                <DetailPanel icon={<UsersRound className="h-5 w-5" />} title="Trainers">
                  <DetailField label="Main Trainer" value={parsed.fields["Main Trainer"] ?? "-"} />
                  <DetailField label="Additional Trainers" value={parsed.fields["Additional Trainers"] ?? "-"} />
                  <DetailField label="Assigned Trainees" value={String(rows.length)} />
                  <DetailField label="Completion" value={`${completionPct}%`} />
                </DetailPanel>
              </div>

              {sessions.length > 0 ? (
                <DetailPanel icon={<CalendarDays className="h-5 w-5" />} title="Sessions">
                  <Table headers={["Session", "Start", "End"]} rows={sessions.map((session) => [session.label, session.start, session.end])} empty="No sessions recorded." />
                </DetailPanel>
              ) : (
                <DetailPanel icon={<CalendarDays className="h-5 w-5" />} title="Session">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <DetailField label="Start" value={parsed.fields.Start ?? "-"} />
                    <DetailField label="End" value={parsed.fields.End ?? "-"} />
                  </div>
                </DetailPanel>
              )}

              <DetailPanel icon={<FileText className="h-5 w-5" />} title="Documents">
                <p className="whitespace-pre-wrap">{parsed.fields.Documents ?? "No internal documents selected."}</p>
              </DetailPanel>

              <DetailPanel icon={<ClipboardList className="h-5 w-5" />} title="Description">
                <TextBlock value={parsed.sections.Description || t.content} />
              </DetailPanel>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DetailPanel icon={<ClipboardList className="h-5 w-5" />} title="Learning Objectives">
                  <TextBlock value={parsed.sections["Learning Objectives"] || "Understand current procedure and quality responsibilities.\nApply training content during regulated work.\nEscalate gaps, changes, and overdue retraining."} />
                </DetailPanel>
                <DetailPanel icon={<ClipboardList className="h-5 w-5" />} title="Assessment / Completion Criteria">
                  <TextBlock value={parsed.sections["Assessment / Completion Criteria"] || "Completion evidence, trainer sign-off, or assessment score will be recorded against each assignment."} />
                </DetailPanel>
              </div>
            </div>
          )}
          {tab === "assignments" && <Assignments rows={rows} users={users.data ?? []} />}
          {tab === "rules" && <Rules rows={rules.data ?? []} />}
          {tab === "history" && <Assignments rows={rows.filter((a) => a.status === "COMPLETED")} users={users.data ?? []} history />}
          {tab === "compliance" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ComplianceChart data={compliance.data} />
              <div className="space-y-3">
                <div className="flex justify-between text-body"><span>Program completion</span><span>{completionPct}%</span></div>
                <ProgressBar value={completionPct} />
                <Table headers={["Role", "Assigned", "Completed", "Completion %", "Overdue"]} rows={[["All roles", rows.length, completed, `${completionPct}%`, <span key="o" className="text-error">{rows.filter((a) => a.status !== "COMPLETED" && a.dueDate && new Date(a.dueDate) < new Date()).length}</span>]]} empty="No compliance data." />
              </div>
            </div>
          )}
          {tab === "trail" && <AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} />}
        </CardContent>
      </Card>

      <ActionFormModal open={modal === "assign"} onOpenChange={(o) => !o && setModal(null)} title="Assign Users" submitLabel="Assign" isPending={action.isPending} successMessage="Training assigned"
        fields={[{ name: "role", label: "Role / audience", type: "select", options: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label })) }, { name: "userIds", label: "Users", type: "select", options: userOptions }, { name: "dueDate", label: "Due date", type: "date", defaultValue: defaultDueDate(t.requiredFrequency) }]}
        onSubmit={async (v) => action.mutateAsync({ path: "assign-users", body: { userIds: [Number(v.userIds)], dueDate: toInstant(v.dueDate) } })} />

      <ActionFormModal open={modal === "rule"} onOpenChange={(o) => !o && setModal(null)} title="Create Auto-Rule" isPending={action.isPending} successMessage="Auto-rule created"
        fields={[{ name: "triggerEvent", label: "Trigger event", type: "select", options: ["Document Approved", "Change Implemented", "New SOP", "Equipment Change"].map((v) => ({ value: v, label: v })) }, { name: "targetAudience", label: "Target audience", type: "select", options: Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label })) }, { name: "daysUntilDue", label: "Days before/after trigger", type: "number", defaultValue: "30" }]}
        onSubmit={async (v) => action.mutateAsync({ path: "create-auto-rule", body: { triggerEvent: v.triggerEvent, targetAudience: [v.targetAudience], daysUntilDue: Number(v.daysUntilDue) } })} />

      <ActionFormModal open={modal === "completion"} onOpenChange={(o) => !o && setModal(null)} title="Record Completion" submitLabel="Record" isPending={action.isPending} successMessage="Completion recorded"
        fields={[{ name: "assignmentId", label: "User assignment", type: "select", options: rows.map((a) => ({ value: String(a.id), label: `${users.data?.find((u) => u.id === a.userId)?.fullName ?? `User #${a.userId}`} - ${a.status}` })) }, { name: "completionDate", label: "Completion date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) }, { name: "evidenceType", label: "Evidence type", type: "select", options: [{ value: "TestScore", label: "Test Score" }, { value: "TrainerSignature", label: "Trainer Signature" }, { value: "URL", label: "URL" }] }, { name: "evidence", label: "Evidence", type: "text", placeholder: "Test Score: 95%" }, { name: "score", label: "Score (if Test Score)", type: "number" }]}
        onSubmit={async (v) => { const a = rows.find((x) => x.id === Number(v.assignmentId)); await action.mutateAsync({ path: "record-completion", body: { assignmentId: Number(v.assignmentId), expectedVersion: a?.version ?? 0, completionEvidence: v.evidence || `${v.evidenceType}: ${v.score}%`, reason: "Training completion recorded" } }); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-label text-muted-foreground">{label}</p><p className="mt-0.5 text-body font-medium">{value}</p></div>;
}
function DetailPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-muted/30">
      <div className="flex items-center gap-2 border-b border-border bg-success/10 px-4 py-3">
        <span className="text-success">{icon}</span>
        <h2 className="text-body font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-label font-semibold text-muted-foreground">{label}</p>
      <div className="mt-1 whitespace-pre-wrap text-body">{value || "-"}</div>
    </div>
  );
}
function TextBlock({ value }: { value: string }) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) {
    return <ul className="list-disc space-y-1 pl-5">{lines.map((line) => <li key={line}>{line}</li>)}</ul>;
  }
  return <p className="whitespace-pre-wrap">{value || "-"}</p>;
}
function Assignments({ rows, users, history = false }: { rows: TrainingAssignment[]; users: { id: number; fullName: string; status: string; email: string }[]; history?: boolean }) {
  return <Table headers={["User Name", "Role", "Assigned Date", "Due Date", "Status", "Completion Date"]} rows={rows.map((a) => [users.find((u) => u.id === a.userId)?.fullName ?? `User #${a.userId}`, "QA", formatDate(a.assignedDate), formatDate(a.dueDate), <AssignmentStatusBadge key={a.id} status={a.status} dueDate={a.dueDate} />, formatDate(a.completionDate)])} empty={history ? "No completions recorded." : "No assignments yet."} />;
}
function Rules({ rows }: { rows: TrainingRule[] }) {
  return <Table headers={["Rule", "Trigger Event", "Target Audience", "Days Until Due", "Actions"]} rows={rows.map((r) => [`Auto-assign to ${AUDIENCE_LABELS[r.targetAudience]} when: ${r.triggerEvent}`, r.triggerEvent, AUDIENCE_LABELS[r.targetAudience], r.dueWithinDays ?? 0, <Button key={r.id} size="sm" variant="outline" disabled>Delete</Button>])} empty="No auto-rules configured." />;
}
function Table({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-body text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><table className="w-full text-body"><thead><tr className="border-b border-border text-left">{headers.map((h) => <th key={h} className="px-3 py-2 text-label uppercase text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-b border-border last:border-0">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody></table></div>;
}
function toInstant(date: string) {
  return date ? new Date(`${date}T00:00:00.000Z`).toISOString() : null;
}
function defaultDueDate(frequency: string) {
  const days = frequency === "BIENNIAL" ? 730 : frequency === "ANNUAL" ? 365 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseTrainingContent(content: string) {
  const fields: Record<string, string> = {};
  const sections: Record<string, string> = {};
  const sectionLabels = new Set(["Description", "Learning Objectives", "Assessment / Completion Criteria"]);
  let currentSection: string | null = null;

  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const sectionName = line.endsWith(":") ? line.slice(0, -1) : "";
    if (sectionLabels.has(sectionName)) {
      currentSection = sectionName;
      sections[currentSection] = "";
      return;
    }

    if (currentSection) {
      sections[currentSection] = [sections[currentSection], line].filter(Boolean).join("\n");
      return;
    }

    const index = line.indexOf(":");
    if (index > -1) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      fields[key] = value;
    }
  });

  return { fields, sections };
}

function sessionRows(fields: Record<string, string>) {
  const rows: { label: string; start: string; end: string }[] = [];
  for (let index = 1; index <= 12; index += 1) {
    const start = fields[`Start ${index}`];
    const end = fields[`End ${index}`];
    if (!start && !end) continue;
    rows.push({ label: `Session ${index}`, start: start || "-", end: end || "-" });
  }
  return rows;
}
