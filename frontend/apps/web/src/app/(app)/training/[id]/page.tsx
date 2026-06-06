"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
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
          <Field label="Audience" value={AUDIENCE_LABELS[t.intendedAudience]} />
          <Field label="Frequency" value={FREQUENCY_LABELS[t.requiredFrequency]} />
          <Field label="Version" value={`v${t.version}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} /></CardHeader>
        <CardContent>
          {tab === "curriculum" && (
            <div className="space-y-4 text-body">
              <div><p className="text-label uppercase text-muted-foreground">Content</p><p className="mt-1 whitespace-pre-wrap">{t.content}</p></div>
              <div><p className="text-label uppercase text-muted-foreground">Learning Objectives</p><ul className="mt-1 list-disc pl-5"><li>Understand current procedure and quality responsibilities.</li><li>Apply training content during regulated work.</li><li>Escalate gaps, changes, and overdue retraining.</li></ul></div>
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
