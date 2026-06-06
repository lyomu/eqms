"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAudit, useAuditFollowUps, useAuditTrail, useAuditAction } from "@/hooks/useAudit";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { AuditStatusBadge } from "@/components/audits/AuditStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ActionFormModal, type FieldDef } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { FINDING_SEVERITY_VARIANT, type FindingSeverity } from "@/types/audit";

type FormModal = null | "plan" | "finding" | "followup" | "capa";

export default function AuditDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const audit = useAudit(id);
  const followups = useAuditFollowUps(id);
  const trail = useAuditTrail(id);
  const action = useAuditAction(id);
  const users = useUsers();
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [modal, setModal] = useState<FormModal>(null);
  const [capaFindingId, setCapaFindingId] = useState<number | null>(null);

  const userOptions = useMemo(
    () => [{ value: "", label: "—" }, ...(users.data?.map((u) => ({ value: String(u.id), label: u.fullName })) ?? [])],
    [users.data]
  );

  if (audit.isLoading) return <LoadingScreen label="Loading audit…" />;
  if (audit.isError || !audit.data) return <ErrorAlert title="Error" message="Failed to load this audit." />;
  const a = audit.data;

  function cancel() {
    const reason = window.prompt("Reason for cancelling:");
    if (reason === null) return;
    action.mutate({ path: "cancel", body: { expectedVersion: a.version, reason: reason || "Cancelled" } }, { onSuccess: () => toast.success("Done") });
  }

  const planFields: FieldDef[] = [
    { name: "scope", label: "Scope", type: "textarea", required: true, defaultValue: a.scope },
    { name: "auditDate", label: "Audit date", type: "date" },
    { name: "auditeeId", label: "Auditee", type: "select", options: userOptions },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/audits" className="hover:underline">Audits</Link><span>/</span><span>{a.auditNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{a.auditTitle}</h1>
          <div className="mt-1 flex items-center gap-2">
            <AuditStatusBadge status={a.status} />
            <Badge variant={a.auditType === "SUPPLIER" ? "info" : "neutral"}>{a.auditType}</Badge>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {a.status === "PLANNED" && <Button onClick={() => setModal("plan")} disabled={action.isPending}>Plan</Button>}
          {a.status === "IN_PROGRESS" && (
            <>
              <Button variant="outline" onClick={() => setModal("finding")} disabled={action.isPending}>Add Finding</Button>
              <Button onClick={() => setFinalizeOpen(true)}>Finalize</Button>
            </>
          )}
          {(a.status === "COMPLETED" || a.status === "FOLLOW_UP") && (
            <Button variant="outline" onClick={() => setModal("followup")} disabled={action.isPending}>Record Follow-up</Button>
          )}
          {!["COMPLETED", "FOLLOW_UP", "CANCELLED"].includes(a.status) && (
            <Button variant="ghost" onClick={cancel} disabled={action.isPending}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Audit No." value={a.auditNo} />
              <Field label="Type" value={a.auditType} />
              <Field label="Status" value={<AuditStatusBadge status={a.status} />} />
              <Field label="Audit Date" value={formatDate(a.auditDate)} />
              <Field label="Auditee" value={users.data?.find((u) => u.id === a.auditeeId)?.fullName ?? (a.auditeeId ? `User #${a.auditeeId}` : "—")} />
              <Field label="Completed" value={formatDate(a.completedDate)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Scope</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body">{a.scope}</p></CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <CardTitle>Findings ({a.findings.length})</CardTitle>
              {a.status === "IN_PROGRESS" && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setModal("finding")}><Plus className="h-4 w-4" /> Add Finding</Button>
              )}
            </CardHeader>
            <CardContent>
              {a.findings.length === 0 ? (
                <p className="text-body text-muted-foreground">No findings recorded.</p>
              ) : (
                <ul className="space-y-3">
                  {a.findings.map((f) => (
                    <li key={f.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{f.findingNumber ?? f.id}</span>
                        <Badge variant={FINDING_SEVERITY_VARIANT[f.severity]}>{f.severity}</Badge>
                        {f.area && <span className="text-label text-muted-foreground">{f.area}</span>}
                        {f.correctiveActionRequired && (
                          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setCapaFindingId(f.id); setModal("capa"); }}>
                            Create CAPA
                          </Button>
                        )}
                      </div>
                      <p className="mt-1 text-body">{f.description}</p>
                      {f.evidence && <p className="mt-1 text-label text-muted-foreground">Evidence: {f.evidence}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {followups.data && followups.data.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Follow-ups</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {followups.data.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 text-body">
                      <Badge variant={f.status === "CLOSED" ? "success" : "warning"}>{f.status.replace("_", " ")}</Badge>
                      <span className="text-label text-muted-foreground">{f.notes || "—"}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent><AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} /></CardContent>
      </Card>

      <SignatureModal open={finalizeOpen} onOpenChange={setFinalizeOpen} title="Finalize Audit" recordNumber={a.auditNo} recordTitle={a.auditTitle} recordNoun="audit" statusNode={<AuditStatusBadge status={a.status} />} isPending={action.isPending} successMessage="Audit finalized"
        onSign={async (creds) => { await action.mutateAsync({ path: "finalize", body: { expectedVersion: a.version, reason: creds.reason || "Audit completed", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement } }); }} />

      <ActionFormModal open={modal === "plan"} onOpenChange={(o) => !o && setModal(null)} title="Plan Audit" isPending={action.isPending} successMessage="Audit planned" fields={planFields}
        onSubmit={async (v) => { await action.mutateAsync({ path: "plan", body: { expectedVersion: a.version, scope: v.scope, auditDate: v.auditDate ? new Date(v.auditDate).toISOString() : undefined, auditeeId: v.auditeeId ? Number(v.auditeeId) : undefined } }); }} />

      <ActionFormModal open={modal === "finding"} onOpenChange={(o) => !o && setModal(null)} title="Record Finding" isPending={action.isPending} successMessage="Finding recorded"
        fields={[
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "area", label: "Area", type: "text", placeholder: "e.g. Quality / Manufacturing" },
          { name: "severity", label: "Severity", type: "select", options: [{ value: "MINOR", label: "Minor" }, { value: "MAJOR", label: "Major" }, { value: "CRITICAL", label: "Critical" }] },
          { name: "evidence", label: "Evidence", type: "textarea" },
          { name: "correctiveActionRequired", label: "Corrective action required", type: "select", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "record-finding", body: { description: v.description, area: v.area || undefined, severity: v.severity as FindingSeverity, evidence: v.evidence || undefined, correctiveActionRequired: v.correctiveActionRequired === "true" } }); }} />

      <ActionFormModal open={modal === "followup"} onOpenChange={(o) => !o && setModal(null)} title="Record Follow-up" isPending={action.isPending} successMessage="Follow-up recorded"
        fields={[
          { name: "previousAuditId", label: "Previous audit id", type: "number", required: true },
          { name: "findingId", label: "Finding id (optional)", type: "number" },
          { name: "status", label: "Status", type: "select", options: [{ value: "STILL_OPEN", label: "Still open" }, { value: "CLOSED", label: "Closed" }] },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "record-follow-up", body: { expectedVersion: a.version, previousAuditId: Number(v.previousAuditId), findingId: v.findingId ? Number(v.findingId) : undefined, status: v.status, notes: v.notes || undefined } }); }} />

      <ActionFormModal open={modal === "capa"} onOpenChange={(o) => { if (!o) { setModal(null); setCapaFindingId(null); } }} title="Create CAPA from Finding" isPending={action.isPending} successMessage="CAPA created"
        fields={[{ name: "description", label: "CAPA description", type: "textarea", required: true }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "create-capa", body: { findingId: capaFindingId, description: v.description, effectivenessCheckRequired: false } }); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-label text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>;
}
