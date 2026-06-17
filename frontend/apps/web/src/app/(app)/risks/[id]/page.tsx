"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRisk, useRiskTrail, useRiskAction } from "@/hooks/useRisk";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { RiskStatusBadge } from "@/components/risks/RiskStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ReasonModal } from "@/components/common/ReasonModal";
import { ActionFormModal, type FieldDef } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, riskScoreClass } from "@/types/risk";
import { cn } from "@/lib/utils";

type FormModal = null | "analysis" | "mitigation" | "verify";
const SCALE_1_5 = Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

export default function RiskDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const risk = useRisk(id);
  const trail = useRiskTrail(id);
  const action = useRiskAction(id);
  const users = useUsers();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [modal, setModal] = useState<FormModal>(null);
  const [reasonAction, setReasonAction] = useState<null | { path: string; title: string; defaultReason: string }>(null);

  const userOptions = useMemo(
    () => [{ value: "", label: "—" }, ...(users.data?.map((u) => ({ value: String(u.id), label: u.fullName })) ?? [])],
    [users.data]
  );

  if (risk.isLoading) return <LoadingScreen label="Loading risk…" />;
  if (risk.isError || !risk.data) return <ErrorAlert title="Error" message="Failed to load this risk." />;
  const r = risk.data;

  function simpleAction(path: string, reason: string) {
    action.mutate({ path, body: { expectedVersion: r.version, reason } }, { onSuccess: () => toast.success("Done") });
  }
  function requestReasonAction(path: string, title: string, defaultReason: string) {
    setReasonAction({ path, title, defaultReason });
  }

  const mitigationFields: FieldDef[] = [
    { name: "controlDescription", label: "Control description", type: "textarea", required: true },
    { name: "controlType", label: "Control type", type: "select", options: [{ value: "DESIGN", label: "Design" }, { value: "PROCESS", label: "Process" }, { value: "MONITORING", label: "Monitoring" }] },
    { name: "ownerId", label: "Owner", type: "select", options: userOptions },
    { name: "verificationMethod", label: "Verification method", type: "text" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/risks" className="hover:underline">Risks</Link><span>/</span><span>{r.riskNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{r.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <RiskStatusBadge status={r.status} />
            <Badge variant="neutral">{CATEGORY_LABELS[r.category]}</Badge>
            <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium", riskScoreClass(r.riskScore))}>
              Score {r.riskScore ?? "—"}
            </span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {r.status === "IDENTIFIED" && <Button onClick={() => setModal("analysis")} disabled={action.isPending}>Hazard Analysis</Button>}
          {r.status === "ANALYZED" && (
            <>
              <Button variant="outline" onClick={() => setModal("mitigation")} disabled={action.isPending}>Add Control</Button>
              <Button onClick={() => simpleAction("implement-controls", "Controls implemented")} disabled={action.isPending}>Implement Controls</Button>
            </>
          )}
          {r.status === "MITIGATED" && (
            <>
              <Button variant="outline" onClick={() => setModal("verify")} disabled={action.isPending}>Verify Effectiveness</Button>
              <Button onClick={() => setAcceptOpen(true)}>Accept Risk</Button>
            </>
          )}
          {r.status === "ACCEPTED" && <Button onClick={() => requestReasonAction("close", "Close Risk", "Closed")} disabled={action.isPending}>Close</Button>}
          {!["CLOSED", "CANCELLED"].includes(r.status) && (
            <Button variant="ghost" onClick={() => requestReasonAction("cancel", "Cancel Risk", "Cancelled")} disabled={action.isPending}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Risk No." value={r.riskNo} />
              <Field label="Category" value={CATEGORY_LABELS[r.category]} />
              <Field label="Status" value={<RiskStatusBadge status={r.status} />} />
              <Field label="Risk Score" value={<span className={cn("rounded-sm px-2 py-0.5 text-label font-medium", riskScoreClass(r.riskScore))}>{r.riskScore ?? "—"}</span>} />
              <Field label="Accepted" value={formatDate(r.acceptedDate)} />
              <Field label="Closed" value={formatDate(r.closedDate)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Block label="Description" value={r.description} />
              <Block label="Potential Impact" value={r.potentialImpact} />
            </CardContent>
          </Card>

          {r.analysis && (
            <Card>
              <CardHeader><CardTitle>Hazard Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-body">
                <div className="flex flex-wrap gap-3 text-label text-muted-foreground">
                  <span>Method: <span className="font-medium text-foreground">{r.analysis.analysisMethod}</span></span>
                  <span>Severity: <span className="font-medium text-foreground">{r.analysis.severity ?? "—"}</span></span>
                  <span>Probability: <span className="font-medium text-foreground">{r.analysis.probability ?? "—"}</span></span>
                  <span>Residual: <span className="font-medium text-foreground">{r.analysis.residualRiskScore ?? "—"}</span></span>
                </div>
                {r.analysis.findings && <Block label="Findings" value={r.analysis.findings} />}
                {r.analysis.consequence && <Block label="Consequence" value={r.analysis.consequence} />}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <CardTitle>Mitigation Controls ({r.mitigations.length})</CardTitle>
              {r.status === "ANALYZED" && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setModal("mitigation")}><Plus className="h-4 w-4" /> Add Control</Button>
              )}
            </CardHeader>
            <CardContent>
              {r.mitigations.length === 0 ? (
                <p className="text-body text-muted-foreground">No controls defined.</p>
              ) : (
                <ul className="space-y-2">
                  {r.mitigations.map((m) => (
                    <li key={m.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{m.controlType}</Badge>
                        <span className="text-label text-muted-foreground">{users.data?.find((u) => u.id === m.ownerId)?.fullName ?? (m.ownerId ? `User #${m.ownerId}` : "Unassigned")}</span>
                      </div>
                      <p className="mt-1 text-body">{m.controlDescription}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {r.effectivenessChecks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Control Effectiveness</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {r.effectivenessChecks.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 text-body">
                      <Badge variant={e.residualRiskAcceptable ? "success" : "warning"}>{e.residualRiskAcceptable ? "Acceptable" : "Not acceptable"}</Badge>
                      <span className="text-label text-muted-foreground">{e.evidence || "—"} · {formatDate(e.verificationDate)}</span>
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

      <SignatureModal open={acceptOpen} onOpenChange={setAcceptOpen} title="Accept Risk" recordNumber={r.riskNo} recordTitle={r.title} recordNoun="risk" statusNode={<RiskStatusBadge status={r.status} />} isPending={action.isPending} successMessage="Risk accepted"
        onSign={async (creds) => { await action.mutateAsync({ path: "accept", body: { expectedVersion: r.version, reason: creds.reason || "Residual risk accepted by management", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement } }); }} />
      <ReasonModal
        open={!!reasonAction}
        onOpenChange={(open) => !open && setReasonAction(null)}
        title={reasonAction?.title ?? "Workflow Action"}
        defaultReason={reasonAction?.defaultReason ?? ""}
        submitLabel="Confirm"
        isPending={action.isPending}
        onSubmit={async (reason) => {
          if (!reasonAction) return;
          await action.mutateAsync({ path: reasonAction.path, body: { expectedVersion: r.version, reason } });
        }}
      />

      <ActionFormModal open={modal === "analysis"} onOpenChange={(o) => !o && setModal(null)} title="Hazard Analysis" isPending={action.isPending} successMessage="Analysis recorded"
        fields={[
          { name: "analysisMethod", label: "Method", type: "select", options: [{ value: "FMEA", label: "FMEA" }, { value: "FISHBONE", label: "Fishbone" }, { value: "HAZOP", label: "HAZOP" }] },
          { name: "findings", label: "Findings", type: "textarea", required: true },
          { name: "consequence", label: "Consequence", type: "text" },
          { name: "severity", label: "Severity (1–5)", type: "select", options: SCALE_1_5, defaultValue: "3" },
          { name: "probability", label: "Probability (1–5)", type: "select", options: SCALE_1_5, defaultValue: "3" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "hazard-analysis", body: { expectedVersion: r.version, analysisMethod: v.analysisMethod, findings: v.findings, consequence: v.consequence || undefined, severity: Number(v.severity), probability: Number(v.probability) } }); }} />

      <ActionFormModal open={modal === "mitigation"} onOpenChange={(o) => !o && setModal(null)} title="Add Mitigation Control" isPending={action.isPending} successMessage="Control added" fields={mitigationFields}
        onSubmit={async (v) => { await action.mutateAsync({ path: "mitigation-plan", body: { controlDescription: v.controlDescription, controlType: v.controlType, ownerId: v.ownerId ? Number(v.ownerId) : undefined, verificationMethod: v.verificationMethod || undefined } }); }} />

      <ActionFormModal open={modal === "verify"} onOpenChange={(o) => !o && setModal(null)} title="Verify Effectiveness" isPending={action.isPending} successMessage="Effectiveness verified"
        fields={[
          { name: "residualRiskScore", label: "Residual risk score (1–25)", type: "number", required: true },
          { name: "residualRiskAcceptable", label: "Residual risk acceptable", type: "select", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
          { name: "evidence", label: "Evidence", type: "textarea" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "verify-effectiveness", body: { residualRiskScore: Number(v.residualRiskScore), residualRiskAcceptable: v.residualRiskAcceptable === "true", evidence: v.evidence || undefined } }); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-label text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>;
}
function Block({ label, value }: { label: string; value: string }) {
  return <div><p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 whitespace-pre-wrap">{value}</p></div>;
}
