"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Network, Plus, Save } from "lucide-react";
import {
  useCreateQmsProcess,
  useQmsProcesses,
  useUpdateQmsProcess,
  type QmsProcess,
  type QmsProcessInput,
  type QmsProcessStatus,
} from "@/hooks/useAdminSettings";
import { useRecordIsoReadiness } from "@/hooks/useRecordDossier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { IsoReadinessPanel } from "@/components/common/IsoReadinessPanel";
import { sanitizeHtml } from "@/lib/html";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<QmsProcessStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  UNDER_REVIEW: "Under Review",
  RETIRED: "Retired",
};

const EMPTY_FORM: QmsProcessInput = {
  name: "",
  department: "",
  processOwnerId: null,
  purpose: "",
  inputs: "",
  outputs: "",
  kpis: "",
  linkedDocuments: "",
  linkedRisks: "",
  linkedTraining: "",
  recordsGenerated: "",
  reviewFrequencyMonths: 12,
  nextReviewDate: "",
  status: "DRAFT",
  reason: "Process register updated",
};

export default function QmsProcessesPage() {
  const processes = useQmsProcesses();
  const create = useCreateQmsProcess();
  const update = useUpdateQmsProcess();
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const selected = useMemo(
    () => processes.data?.find((process) => process.id === selectedId),
    [processes.data, selectedId]
  );
  const [draft, setDraft] = useState<QmsProcessInput>(EMPTY_FORM);
  const readiness = useRecordIsoReadiness("QmsProcess", selected?.id ?? "");

  function selectProcess(process: QmsProcess | "new") {
    if (process === "new") {
      setSelectedId("new");
      setDraft(EMPTY_FORM);
      return;
    }
    setSelectedId(process.id);
    setDraft({
      name: process.name,
      processOwnerId: process.processOwnerId,
      department: process.department ?? "",
      purpose: process.purpose ?? "",
      inputs: process.inputs ?? "",
      outputs: process.outputs ?? "",
      kpis: process.kpis ?? "",
      linkedDocuments: process.linkedDocuments ?? "",
      linkedRisks: process.linkedRisks ?? "",
      linkedTraining: process.linkedTraining ?? "",
      recordsGenerated: process.recordsGenerated ?? "",
      reviewFrequencyMonths: process.reviewFrequencyMonths,
      nextReviewDate: process.nextReviewDate ?? "",
      status: process.status,
      expectedVersion: process.version,
      reason: "Process register updated",
    });
  }

  async function submit() {
    if (selected) {
      await update.mutateAsync({ id: selected.id, ...draft, expectedVersion: selected.version });
      return;
    }
    const created = await create.mutateAsync(draft);
    selectProcess(created);
  }

  if (processes.isLoading) return <LoadingScreen label="Loading process register..." />;
  if (processes.isError) return <ErrorAlert title="Error" message="Could not load QMS processes." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-label text-muted-foreground">
            <Link href="/settings" className="hover:underline">Settings</Link> / Process Register
          </div>
          <h1 className="text-h1 text-brand-primary">Process Register</h1>
        </div>
        <Button className="ml-auto" onClick={() => selectProcess("new")}>
          <Plus className="h-4 w-4" />
          New Process
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>Controlled Processes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(processes.data ?? []).length === 0 && <p className="text-body text-muted-foreground">No processes defined yet.</p>}
            {(processes.data ?? []).map((process) => (
              <button
                key={process.id}
                type="button"
                onClick={() => selectProcess(process)}
                className={`w-full rounded-md border px-3 py-2 text-left ${selectedId === process.id ? "border-brand-primary bg-brand-light" : "border-border bg-background"}`}
              >
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-brand-primary" />
                  <span className="font-medium">{process.name}</span>
                </div>
                <div className="mt-1 text-label text-muted-foreground">
                  {process.processCode} - {STATUS_LABELS[process.status]} - Review {process.nextReviewDate ? formatDate(process.nextReviewDate) : "not set"}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{selected ? selected.processCode : "New Process"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name" value={draft.name ?? ""} onChange={(value) => setDraft((d) => ({ ...d, name: value }))} />
                <Field label="Department" value={draft.department ?? ""} onChange={(value) => setDraft((d) => ({ ...d, department: value }))} />
                <Field label="Owner user ID" value={draft.processOwnerId ? String(draft.processOwnerId) : ""} onChange={(value) => setDraft((d) => ({ ...d, processOwnerId: value ? Number(value) : null }))} />
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={draft.status ?? "DRAFT"} onChange={(event) => setDraft((d) => ({ ...d, status: event.target.value as QmsProcessStatus }))}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                </div>
                <Field label="Review frequency months" value={String(draft.reviewFrequencyMonths ?? 12)} onChange={(value) => setDraft((d) => ({ ...d, reviewFrequencyMonths: Number(value) || 12 }))} />
                <Field label="Next review date" type="date" value={draft.nextReviewDate ?? ""} onChange={(value) => setDraft((d) => ({ ...d, nextReviewDate: value }))} />
              </div>

              <RichField label="Purpose" value={draft.purpose} onChange={(value) => setDraft((d) => ({ ...d, purpose: value }))} />
              <RichField label="Inputs" value={draft.inputs} onChange={(value) => setDraft((d) => ({ ...d, inputs: value }))} />
              <RichField label="Outputs" value={draft.outputs} onChange={(value) => setDraft((d) => ({ ...d, outputs: value }))} />
              <RichField label="KPIs" value={draft.kpis} onChange={(value) => setDraft((d) => ({ ...d, kpis: value }))} />
              <RichField label="Linked Documents" value={draft.linkedDocuments} onChange={(value) => setDraft((d) => ({ ...d, linkedDocuments: value }))} />
              <RichField label="Linked Risks" value={draft.linkedRisks} onChange={(value) => setDraft((d) => ({ ...d, linkedRisks: value }))} />
              <RichField label="Linked Training" value={draft.linkedTraining} onChange={(value) => setDraft((d) => ({ ...d, linkedTraining: value }))} />
              <RichField label="Records Generated" value={draft.recordsGenerated} onChange={(value) => setDraft((d) => ({ ...d, recordsGenerated: value }))} />

              <div className="flex justify-end">
                <Button onClick={submit} disabled={create.isPending || update.isPending || !draft.name?.trim()}>
                  <Save className="h-4 w-4" />
                  {selected ? "Save Process" : "Create Process"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {selected && <IsoReadinessPanel readiness={readiness.data} isLoading={readiness.isLoading} isError={readiness.isError} />}

          {selected && (
            <Card>
              <CardHeader><CardTitle>Process Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <HtmlBlock title="Purpose" value={selected.purpose} />
                <HtmlBlock title="Inputs" value={selected.inputs} />
                <HtmlBlock title="Outputs" value={selected.outputs} />
                <HtmlBlock title="KPIs" value={selected.kpis} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function RichField({ label, value, onChange }: { label: string; value?: string | null; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <RichTextEditor value={value ?? ""} onChange={onChange} minHeight={120} />
    </div>
  );
}

function HtmlBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div>
      <div className="text-label text-muted-foreground">{title}</div>
      <div className="rich-text-content rounded-md border border-border px-3 py-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || "-") }} />
    </div>
  );
}
