"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useRisk, useRiskTrail, useRiskAction } from "@/hooks/useRisk";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { RiskStatusBadge } from "@/components/risks/RiskStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ReasonModal } from "@/components/common/ReasonModal";
import { ActionFormModal, type FieldDef } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { RecordDossierPanel } from "@/components/common/RecordDossierPanel";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, RISK_STATUS_LABELS, riskScoreClass } from "@/types/risk";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "assessment" | "controls" | "audit";
type FormModal = null | "analysis" | "mitigation" | "verify";

const SCALE_1_5 = Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

const SEV_LABELS: Record<number, string> = { 1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Critical" };
const PROB_LABELS: Record<number, string> = { 1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Almost Certain" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageInDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function riskLevel(score: number | null | undefined): { label: string; cls: string; variant: "success" | "warning" | "error" | "neutral" } {
  if (!score) return { label: "Not Assessed", cls: "bg-muted text-muted-foreground", variant: "neutral" };
  if (score >= 17) return { label: "Critical", cls: "bg-error text-white", variant: "error" };
  if (score >= 10) return { label: "High", cls: "bg-error/15 text-error", variant: "error" };
  if (score >= 5) return { label: "Medium", cls: "bg-warning/20 text-[#8A6D00]", variant: "warning" };
  return { label: "Low", cls: "bg-success/15 text-success", variant: "success" };
}

// ─── Risk Matrix (5×5 heatmap) ───────────────────────────────────────────────

function RiskMatrix({
  severity,
  probability,
  title,
}: {
  severity: number | null;
  probability: number | null;
  title: string;
}) {
  const sevRows = [5, 4, 3, 2, 1];
  const probCols = [1, 2, 3, 4, 5];

  function cellColor(s: number, p: number): string {
    const sc = s * p;
    if (sc >= 17) return "bg-error/80 text-white";
    if (sc >= 10) return "bg-error/30 text-error";
    if (sc >= 5) return "bg-warning/30 text-[#8A6D00]";
    return "bg-success/20 text-success";
  }

  return (
    <div className="space-y-2">
      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="flex items-start gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col items-center gap-1">
            {sevRows.map((s) => (
              <div key={s} className="flex h-9 w-16 items-center justify-end pr-2">
                <span className="text-[10px] text-muted-foreground text-right leading-tight">{SEV_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Grid */}
          {sevRows.map((s) => (
            <div key={s} className="flex gap-1 mb-1">
              {probCols.map((p) => {
                const score = s * p;
                const isActive = s === severity && p === probability;
                return (
                  <div
                    key={p}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded text-[11px] font-bold transition-all",
                      cellColor(s, p),
                      isActive && "ring-2 ring-brand-primary ring-offset-1 scale-110 relative z-10"
                    )}
                  >
                    {score}
                  </div>
                );
              })}
            </div>
          ))}
          {/* X-axis labels */}
          <div className="flex gap-1 mt-1">
            {probCols.map((p) => (
              <div key={p} className="flex h-8 w-9 items-start justify-center pt-1 text-[10px] text-muted-foreground text-center leading-tight">
                {PROB_LABELS[p].split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-1">← Likelihood →</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {[
          { label: "Low (1–4)", cls: "bg-success/20 text-success" },
          { label: "Medium (5–9)", cls: "bg-warning/30 text-[#8A6D00]" },
          { label: "High (10–16)", cls: "bg-error/30 text-error" },
          { label: "Critical (17–25)", cls: "bg-error/80 text-white" },
        ].map((l) => (
          <span key={l.label} className={cn("rounded px-2 py-0.5 text-[11px] font-semibold", l.cls)}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiskDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const risk = useRisk(id);
  const trail = useRiskTrail(id);
  const action = useRiskAction(id);
  const users = useUsers();

  const initialTab = (searchParams.get("tab") as TabKey) ?? "overview";
  const [tab, setTab] = useState<TabKey>(initialTab);
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
  const level = riskLevel(r.riskScore);
  const isHighCritical = (r.riskScore ?? 0) >= 10;
  const isOpen = !["CLOSED", "CANCELLED"].includes(r.status);

  // Derived stats
  const effectivenessOk = r.effectivenessChecks.filter((e) => e.residualRiskAcceptable).length;
  const effectivenessBad = r.effectivenessChecks.filter((e) => !e.residualRiskAcceptable).length;
  const analysed = r.status !== "IDENTIFIED";
  const hasControls = r.mitigations.length > 0;
  const hasEffectivenessCheck = r.effectivenessChecks.length > 0;

  function simpleAction(path: string, reason: string) {
    action.mutate({ path, body: { expectedVersion: r.version, reason } }, { onSuccess: () => toast.success("Done") });
  }

  const mitigationFields: FieldDef[] = [
    { name: "controlDescription", label: "Control description", type: "textarea", required: true },
    {
      name: "controlType", label: "Control type", type: "select",
      options: [
        { value: "DESIGN", label: "Design / Engineering" },
        { value: "PROCESS", label: "Process / Procedural" },
        { value: "MONITORING", label: "Monitoring / Detective" },
      ],
    },
    { name: "ownerId", label: "Owner", type: "select", options: userOptions },
    { name: "verificationMethod", label: "Verification method", type: "text" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb + header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/risks" className="hover:underline">Risks</Link>
            <span>/</span>
            <span>{r.riskNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{r.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RiskStatusBadge status={r.status} />
            <Badge variant="neutral">{CATEGORY_LABELS[r.category]}</Badge>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-label font-semibold", level.cls)}>
              {level.label} · Score {r.riskScore ?? "—"}
            </span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {r.status === "IDENTIFIED" && (
            <Button onClick={() => setModal("analysis")} disabled={action.isPending}>
              Perform Analysis
            </Button>
          )}
          {r.status === "ANALYZED" && (
            <>
              <Button variant="outline" onClick={() => setModal("mitigation")} disabled={action.isPending}>
                Add Control
              </Button>
              <Button onClick={() => simpleAction("implement-controls", "Controls implemented")} disabled={action.isPending}>
                Implement Controls
              </Button>
            </>
          )}
          {r.status === "MITIGATED" && (
            <>
              <Button variant="outline" onClick={() => setModal("verify")} disabled={action.isPending}>
                Verify Effectiveness
              </Button>
              <Button onClick={() => setAcceptOpen(true)} disabled={action.isPending}>
                Accept Risk
              </Button>
            </>
          )}
          {r.status === "ACCEPTED" && (
            <Button
              onClick={() => setReasonAction({ path: "close", title: "Close Risk", defaultReason: "Risk closed following acceptance and monitoring period" })}
              disabled={action.isPending}
            >
              Close Risk
            </Button>
          )}
          {isOpen && (
            <Button
              variant="ghost"
              onClick={() => setReasonAction({ path: "cancel", title: "Cancel Risk", defaultReason: "Cancelled" })}
              disabled={action.isPending}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ── Warning banners ── */}
      {isHighCritical && isOpen && (
        <div className="flex items-start gap-3 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{level.label} risk — requires QA review and formal approval</p>
            <p className="text-label">Risk score {r.riskScore} requires formal assessment approval before acceptance or closure.</p>
          </div>
        </div>
      )}
      {r.status === "IDENTIFIED" && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold">Risk assessment pending</p>
            <p className="text-label text-muted-foreground">Perform a hazard analysis to score the risk and move to the next workflow stage.</p>
          </div>
        </div>
      )}
      {effectivenessBad > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{effectivenessBad} effectiveness check(s) indicate residual risk is not acceptable</p>
            <p className="text-label">Additional controls or a CAPA may be required before this risk can be accepted.</p>
          </div>
        </div>
      )}

      {/* ── Key info strip ── */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-body sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Category" value={CATEGORY_LABELS[r.category]} />
          <Meta label="Status" value={RISK_STATUS_LABELS[r.status]} />
          <Meta label="Risk Score" value={r.riskScore ? String(r.riskScore) : "—"} />
          <Meta label="Risk Level" value={level.label} />
          <Meta label="Accepted" value={formatDate(r.acceptedDate)} />
          <Meta label="Closed" value={formatDate(r.closedDate)} />
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "assessment", label: "Assessment" },
              { key: "controls", label: "Controls & Mitigation", count: r.mitigations.length },
              { key: "audit", label: "Audit Trail" },
            ]}
          />
          <div className="ml-auto py-1 flex gap-2">
            {tab === "controls" && r.status === "ANALYZED" && (
              <Button size="sm" variant="outline" onClick={() => setModal("mitigation")}>
                <Plus className="h-4 w-4" /> Add Control
              </Button>
            )}
            {tab === "assessment" && r.status === "IDENTIFIED" && (
              <Button size="sm" variant="outline" onClick={() => setModal("analysis")}>
                <Plus className="h-4 w-4" /> Analyse
              </Button>
            )}
          </div>
        </div>

        <CardContent className="pt-4">
          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Risk Score" value={r.riskScore ?? 0} color={riskScoreClass(r.riskScore)} isScore />
                <MetricCard label="Controls" value={r.mitigations.length} />
                <MetricCard label="Eff. Checks" value={r.effectivenessChecks.length} />
                <MetricCard label="Age" value={ageInDays(r.createdAt)} suffix="d" />
              </div>

              {/* Status checklist */}
              <div>
                <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                  Workflow Progress
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckItem label="Risk Identified & Registered" ok detail={`Registered as ${r.riskNo}`} />
                  <CheckItem
                    label="Risk Assessment Completed"
                    ok={analysed}
                    detail={analysed && r.analysis ? `Method: ${r.analysis.analysisMethod}, Score: ${r.riskScore ?? "—"}` : "Hazard analysis not yet performed"}
                  />
                  <CheckItem
                    label="Controls Defined"
                    ok={hasControls}
                    detail={hasControls ? `${r.mitigations.length} control(s) in place` : "No controls defined yet"}
                  />
                  <CheckItem
                    label="Effectiveness Verified"
                    ok={effectivenessOk > 0}
                    detail={effectivenessOk > 0 ? `${effectivenessOk} check(s) passed` : "Effectiveness not yet verified"}
                  />
                  <CheckItem
                    label="Residual Risk Acceptable"
                    ok={effectivenessOk > 0 && effectivenessBad === 0}
                    detail={
                      effectivenessBad > 0
                        ? `${effectivenessBad} check(s) show unacceptable residual risk`
                        : effectivenessOk > 0
                        ? "All effectiveness checks passed"
                        : "Residual risk not yet assessed"
                    }
                  />
                  <CheckItem
                    label="Risk Formally Accepted / Closed"
                    ok={r.status === "ACCEPTED" || r.status === "CLOSED"}
                    detail={
                      r.status === "ACCEPTED" ? `Accepted on ${formatDate(r.acceptedDate)}` :
                      r.status === "CLOSED" ? `Closed on ${formatDate(r.closedDate)}` :
                      "Pending acceptance or closure"
                    }
                  />
                </div>
              </div>

              {/* Risk statement */}
              <div>
                <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                  Risk Statement
                </h3>
                <div className="space-y-3">
                  <Block label="Description" value={r.description} />
                  <Block label="Potential Impact" value={r.potentialImpact} />
                  {r.analysis?.findings && <Block label="Analysis Findings" value={r.analysis.findings} />}
                  {r.analysis?.consequence && <Block label="Consequence" value={r.analysis.consequence} />}
                </div>
              </div>
            </div>
          )}

          {/* ── Assessment tab ── */}
          {tab === "assessment" && (
            <div className="space-y-6">
              {!r.analysis ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-body text-muted-foreground">No assessment has been performed yet.</p>
                  <Button onClick={() => setModal("analysis")}>
                    <Plus className="h-4 w-4" /> Perform Hazard Analysis
                  </Button>
                </div>
              ) : (
                <>
                  {/* Score summary */}
                  <div className="flex flex-wrap gap-3">
                    <StatPill label="Method" value={r.analysis.analysisMethod} />
                    <StatPill
                      label="Severity"
                      value={`${r.analysis.severity ?? "—"} — ${r.analysis.severity ? SEV_LABELS[r.analysis.severity] ?? "" : ""}`}
                      color={riskScoreClass(r.analysis.severity)}
                    />
                    <StatPill
                      label="Probability"
                      value={`${r.analysis.probability ?? "—"} — ${r.analysis.probability ? PROB_LABELS[r.analysis.probability] ?? "" : ""}`}
                    />
                    <StatPill
                      label="Inherent Score"
                      value={r.riskScore ?? "—"}
                      color={riskScoreClass(r.riskScore)}
                    />
                    <StatPill label="Risk Level" value={level.label} color={level.cls} />
                    {r.analysis.residualRiskScore !== null && (
                      <StatPill
                        label="Residual Score"
                        value={r.analysis.residualRiskScore}
                        color={riskScoreClass(r.analysis.residualRiskScore)}
                      />
                    )}
                  </div>

                  {/* Risk matrix */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <RiskMatrix
                      severity={r.analysis.severity}
                      probability={r.analysis.probability}
                      title="Inherent Risk Position"
                    />
                    {r.analysis.residualRiskScore !== null && r.effectivenessChecks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Residual Risk</p>
                        <div className="space-y-2">
                          {r.effectivenessChecks.map((ec, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-body">
                              <Badge variant={ec.residualRiskAcceptable ? "success" : "error"}>
                                {ec.residualRiskAcceptable ? "Acceptable" : "Not Acceptable"}
                              </Badge>
                              <span className="text-label text-muted-foreground">
                                {formatDate(ec.verificationDate)} — {ec.evidence ?? "No evidence recorded"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analysis details */}
                  <div className="space-y-3">
                    {r.analysis.findings && <Block label="Findings" value={r.analysis.findings} />}
                    {r.analysis.consequence && <Block label="Consequence" value={r.analysis.consequence} />}
                  </div>

                  {/* Re-assess button */}
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setModal("analysis")}>
                      Update Assessment
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Controls & Mitigation tab ── */}
          {tab === "controls" && (
            <div className="space-y-6">
              {/* Mitigation controls */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
                    Mitigation Controls ({r.mitigations.length})
                  </h3>
                  {r.status === "ANALYZED" && (
                    <Button size="sm" variant="outline" onClick={() => setModal("mitigation")}>
                      <Plus className="h-4 w-4" /> Add Control
                    </Button>
                  )}
                </div>

                {r.mitigations.length === 0 ? (
                  <Empty text="No controls defined." />
                ) : (
                  <div className="space-y-2">
                    {r.mitigations.map((m) => (
                      <div key={m.id} className="rounded-md border border-border p-3 text-body">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="info">
                            {m.controlType === "DESIGN" ? "Design / Engineering" : m.controlType === "PROCESS" ? "Process / Procedural" : "Monitoring / Detective"}
                          </Badge>
                          <span className="text-label text-muted-foreground">
                            Owner: {users.data?.find((u) => u.id === m.ownerId)?.fullName ?? (m.ownerId ? `User #${m.ownerId}` : "Unassigned")}
                          </span>
                          <span className="ml-auto text-label text-muted-foreground">{formatDate(m.implementationDate)}</span>
                        </div>
                        <p className="mt-2">{m.controlDescription}</p>
                        {m.verificationMethod && (
                          <p className="mt-1 text-label text-muted-foreground">Verification: {m.verificationMethod}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Effectiveness checks */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
                    Effectiveness Checks ({r.effectivenessChecks.length})
                  </h3>
                  {r.status === "MITIGATED" && (
                    <Button size="sm" variant="outline" onClick={() => setModal("verify")}>
                      <Plus className="h-4 w-4" /> Verify
                    </Button>
                  )}
                </div>

                {r.effectivenessChecks.length === 0 ? (
                  <Empty text="No effectiveness checks recorded yet." />
                ) : (
                  <div className="space-y-2">
                    {r.effectivenessChecks.map((ec, i) => (
                      <div key={i} className={cn("rounded-md border p-3 text-body", ec.residualRiskAcceptable ? "border-success/30 bg-success/5" : "border-error/30 bg-error/5")}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={ec.residualRiskAcceptable ? "success" : "error"}>
                            Residual Risk {ec.residualRiskAcceptable ? "Acceptable" : "Not Acceptable"}
                          </Badge>
                          <span className="ml-auto text-label text-muted-foreground">{formatDate(ec.verificationDate)}</span>
                        </div>
                        {ec.evidence && <p className="mt-2 text-label text-muted-foreground">Evidence: {ec.evidence}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Implement controls action */}
              {r.status === "ANALYZED" && r.mitigations.length > 0 && (
                <div className="rounded-md border border-brand-primary/20 bg-brand-light/30 p-4">
                  <p className="text-body font-medium">Ready to implement controls?</p>
                  <p className="text-label text-muted-foreground mt-1">
                    Once controls are defined, mark them as implemented to progress the risk to the Mitigated status.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => simpleAction("implement-controls", "Controls implemented")}
                    disabled={action.isPending}
                  >
                    Mark Controls as Implemented
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Audit Trail tab ── */}
          {tab === "audit" && (
            <AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} />
          )}
        </CardContent>
      </Card>

      {/* ── Dossier panel ── */}
      <RecordDossierPanel
        recordType="Risk"
        recordId={r.id}
        recordNumber={r.riskNo}
        title={r.title}
        fields={[
          { label: "Status", value: <RiskStatusBadge status={r.status} /> },
          { label: "Category", value: CATEGORY_LABELS[r.category] },
          { label: "Risk Score", value: r.riskScore ?? "—" },
          { label: "Risk Level", value: level.label },
          { label: "Accepted", value: formatDate(r.acceptedDate) },
          { label: "Closed", value: formatDate(r.closedDate) },
          { label: "Controls", value: r.mitigations.length },
        ]}
        sections={[
          { title: "Description", content: <p className="whitespace-pre-wrap">{r.description}</p> },
          { title: "Potential Impact", content: <p className="whitespace-pre-wrap">{r.potentialImpact}</p> },
          { title: "Analysis", content: r.analysis?.findings ?? "No analysis recorded." },
        ]}
      />

      {/* ── Accept Risk (Signature) modal ── */}
      <SignatureModal
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        title="Accept Risk"
        recordNumber={r.riskNo}
        recordTitle={r.title}
        recordNoun="risk"
        statusNode={<RiskStatusBadge status={r.status} />}
        isPending={action.isPending}
        successMessage="Risk accepted"
        onSign={async (creds) => {
          await action.mutateAsync({
            path: "accept",
            body: {
              expectedVersion: r.version,
              reason: creds.reason || "Residual risk accepted following assessment and effectiveness review",
              password: creds.password,
              totpCode: creds.totpCode,
              meaningStatement: creds.meaningStatement,
            },
          });
        }}
      />

      {/* ── Reason modal (cancel / close) ── */}
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

      {/* ── Hazard Analysis modal ── */}
      <ActionFormModal
        open={modal === "analysis"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Hazard Analysis"
        isPending={action.isPending}
        successMessage="Analysis recorded"
        fields={[
          {
            name: "analysisMethod", label: "Analysis Method", type: "select",
            options: [
              { value: "FMEA", label: "FMEA (Failure Mode & Effects Analysis)" },
              { value: "FISHBONE", label: "Fishbone / Ishikawa" },
              { value: "HAZOP", label: "HAZOP (Hazard & Operability Study)" },
            ],
          },
          { name: "findings", label: "Findings / Analysis Summary", type: "textarea", required: true },
          { name: "consequence", label: "Consequence", type: "text" },
          { name: "severity", label: "Severity (1 = Negligible → 5 = Critical)", type: "select", options: SCALE_1_5, defaultValue: "3" },
          { name: "probability", label: "Probability (1 = Rare → 5 = Almost Certain)", type: "select", options: SCALE_1_5, defaultValue: "3" },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "hazard-analysis",
            body: {
              expectedVersion: r.version,
              analysisMethod: v.analysisMethod,
              findings: v.findings,
              consequence: v.consequence || undefined,
              severity: Number(v.severity),
              probability: Number(v.probability),
            },
          });
        }}
      />

      {/* ── Add Mitigation Control modal ── */}
      <ActionFormModal
        open={modal === "mitigation"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Add Mitigation Control"
        isPending={action.isPending}
        successMessage="Control added"
        fields={mitigationFields}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "mitigation-plan",
            body: {
              controlDescription: v.controlDescription,
              controlType: v.controlType,
              ownerId: v.ownerId ? Number(v.ownerId) : undefined,
              verificationMethod: v.verificationMethod || undefined,
            },
          });
        }}
      />

      {/* ── Verify Effectiveness modal ── */}
      <ActionFormModal
        open={modal === "verify"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Verify Control Effectiveness"
        isPending={action.isPending}
        successMessage="Effectiveness verified"
        fields={[
          { name: "residualRiskScore", label: "Residual risk score (1–25)", type: "number", required: true },
          {
            name: "residualRiskAcceptable", label: "Residual risk acceptable?", type: "select",
            options: [{ value: "true", label: "Yes — residual risk is acceptable" }, { value: "false", label: "No — further action required" }],
          },
          { name: "evidence", label: "Evidence / justification", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "verify-effectiveness",
            body: {
              residualRiskScore: Number(v.residualRiskScore),
              residualRiskAcceptable: v.residualRiskAcceptable === "true",
              evidence: v.evidence || undefined,
            },
          });
        }}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, color, isScore, suffix }: { label: string; value: number; color?: string; isScore?: boolean; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        {isScore ? (
          <span className={cn("inline-flex items-center rounded px-3 py-1 text-2xl font-bold", color ?? "bg-muted text-muted-foreground")}>
            {value || "—"}
          </span>
        ) : (
          <p className="text-2xl font-bold text-brand-primary">{value}{suffix}</p>
        )}
        <p className="mt-0.5 text-label text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-label font-semibold", color ?? "bg-muted text-muted-foreground")}>
      <span>{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function CheckItem({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-body", ok ? "border-success/30 bg-success/5" : "border-error/30 bg-error/5")}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />}
      <div>
        <p className={cn("font-medium", ok ? "text-success" : "text-error")}>{label}</p>
        {detail && <p className="text-label text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-body text-muted-foreground">{text}</p>;
}
