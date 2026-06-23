"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  useDeviation,
  useDeviationAudit,
  useDeviationTransition,
  useApproveDeviation,
  type DeviationAction,
} from "@/hooks/useDeviation";
import {
  useReopenDeviation,
  useContainmentActions,
  useAddContainmentAction,
  useImpactAssessment,
  useUpsertImpactAssessment,
  useDeviationInvestigation,
  useUpsertInvestigation,
  useDeviationLinkedRecords,
  useAddLinkedRecord,
  useRemoveLinkedRecord,
} from "@/hooks/useDeviations";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ReasonModal } from "@/components/common/ReasonModal";
import { ActionFormModal, type FieldDef } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  RISK_LEVEL_LABELS,
  DEVIATION_TYPE_LABELS,
  SEVERITY_LABELS,
  deviationStatusVariant,
  deviationSeverityVariant,
  deviationRiskVariant,
  ageInDays,
  daysUntil,
  type DeviationStatus,
  type ContainmentActionResponse,
  type ImpactAssessmentResponse,
  type DeviationInvestigationResponse,
  type LinkedRecordResponse,
} from "@/types/deviation";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "overview" | "details" | "containment" | "impact" | "investigation" | "linked" | "closure" | "trail";

const OPEN_STATUSES: DeviationStatus[] = [
  "DRAFT",
  "REPORTED",
  "UNDER_INVESTIGATION",
  "INVESTIGATION_IN_PROGRESS",
  "REOPENED",
];

// ─── Helper sub-components ────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-body">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, color, suffix }: { label: string; value: number | string; color?: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={cn("text-2xl font-bold", color ?? "text-brand-primary")}>{value}{suffix}</p>
        <p className="mt-0.5 text-label text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-label font-semibold text-muted-foreground">
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function CheckItem({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-body", ok ? "border-success/30 bg-success/5" : "border-border bg-background")}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div>
        <p className={cn("font-medium", ok ? "text-success" : "text-foreground")}>{label}</p>
        {detail && <p className="text-label text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function Empty({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p className="text-body text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

// ─── Containment Status badge ─────────────────────────────────────────────────

function containmentStatusVariant(s: string): "neutral" | "info" | "success" | "warning" | "error" {
  switch (s) {
    case "COMPLETED": return "success";
    case "IN_PROGRESS": return "info";
    case "OVERDUE": return "error";
    case "CANCELLED": return "neutral";
    default: return "warning";
  }
}

function containmentStatusLabel(s: string): string {
  switch (s) {
    case "NOT_STARTED": return "Not Started";
    case "IN_PROGRESS": return "In Progress";
    case "COMPLETED": return "Completed";
    case "OVERDUE": return "Overdue";
    case "CANCELLED": return "Cancelled";
    default: return s;
  }
}

function containmentTypeLabel(t: string): string {
  const map: Record<string, string> = {
    CONTAINMENT: "Containment",
    CORRECTION: "Correction",
    PRODUCT_HOLD: "Product Hold",
    EQUIPMENT_HOLD: "Equipment Hold",
    PROCESS_STOP: "Process Stop",
    SEGREGATION: "Segregation",
    QUARANTINE: "Quarantine",
    NOTIFICATION: "Notification",
    OTHER: "Other",
  };
  return map[t] ?? t;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeviationDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading deviation…" />}>
      <DeviationDetailContent />
    </Suspense>
  );
}

function DeviationDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const dev = useDeviation(id);
  const audit = useDeviationAudit(id);
  const transition = useDeviationTransition();
  const approve = useApproveDeviation();
  const reopen = useReopenDeviation();
  const users = useUsers();

  const containmentActions = useContainmentActions(id);
  const impactAssessment = useImpactAssessment(id);
  const investigation = useDeviationInvestigation(id);
  const linkedRecords = useDeviationLinkedRecords(id);
  const addContainment = useAddContainmentAction();
  const upsertImpact = useUpsertImpactAssessment();
  const upsertInvestigation = useUpsertInvestigation();
  const addLinked = useAddLinkedRecord();
  const removeLinked = useRemoveLinkedRecord();

  const initialTab = (searchParams.get("tab") as TabKey) ?? "overview";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: DeviationAction; title: string; defaultReason: string }>(null);
  const [showAddContainment, setShowAddContainment] = useState(false);
  const [showAddLinked, setShowAddLinked] = useState(false);

  // Impact assessment local state
  const [impactValues, setImpactValues] = useState<Record<string, string>>({});

  // Investigation local state
  const [invValues, setInvValues] = useState<Record<string, string>>({});

  // Initialise local edit states when query data first arrives
  const impactData = impactAssessment.data;
  const invData = investigation.data;

  useEffect(() => {
    if (!impactData) return;
    const init: Record<string, string> = {};
    (Object.keys(impactData) as (keyof ImpactAssessmentResponse)[]).forEach((k) => {
      const v = impactData[k];
      if (typeof v === "string") init[k] = v;
    });
    setImpactValues(init);
  }, [impactData]);

  useEffect(() => {
    if (!invData) return;
    const init: Record<string, string> = {};
    (Object.keys(invData) as (keyof DeviationInvestigationResponse)[]).forEach((k) => {
      const v = invData[k];
      if (typeof v === "string") init[k] = v;
    });
    setInvValues(init);
  }, [invData]);

  const userMap = useMemo(() => {
    const m = new Map<number, string>();
    users.data?.forEach((u) => m.set(u.id, u.fullName));
    return m;
  }, [users.data]);

  const userOptions = useMemo(
    () => [{ value: "", label: "—" }, ...(users.data?.map((u) => ({ value: String(u.id), label: u.fullName })) ?? [])],
    [users.data]
  );

  if (dev.isLoading) return <LoadingScreen label="Loading deviation…" />;
  if (dev.isError || !dev.data) return <ErrorAlert title="Error" message="Failed to load this deviation." />;

  const d = dev.data;
  const isOpen = OPEN_STATUSES.includes(d.status);
  const age = ageInDays(d.createdAt);
  const invDays = daysUntil(d.targetInvestigationDueDate);
  const closureDays = daysUntil(d.targetClosureDueDate);
  const isInvOverdue = invDays !== null && invDays < 0 && isOpen;
  const isClosureOverdue = closureDays !== null && closureDays < 0 && d.status !== "CLOSED" && d.status !== "CANCELLED";
  const riskLevel = d.finalRiskLevel ?? d.initialRiskLevel;
  const ca = containmentActions.data ?? [];
  const lr = linkedRecords.data ?? [];
  const inv = investigation.data;
  const impact = impactAssessment.data;

  // Workflow checklist derivations
  const hasContainment = ca.length > 0;
  const investigationComplete = inv?.status === "COMPLETED";
  const rootCauseDoc = !!d.rootCause || !!inv?.rootCauseDescription;
  const capaLinked = lr.some((r) => r.linkedRecordType === "CAPA");

  async function runAction(act: DeviationAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: d.version, reason });
      toast.success("Done");
    } catch { /* interceptor surfaces errors */ }
  }

  // ─── Field defs for modals ────────────────────────────────────────────────
  const containmentFields: FieldDef[] = [
    { name: "description", label: "Description", type: "textarea", required: true, placeholder: "Describe the containment action" },
    {
      name: "actionType", label: "Action Type", type: "select",
      options: [
        { value: "CONTAINMENT", label: "Containment" },
        { value: "CORRECTION", label: "Correction" },
        { value: "PRODUCT_HOLD", label: "Product Hold" },
        { value: "EQUIPMENT_HOLD", label: "Equipment Hold" },
        { value: "PROCESS_STOP", label: "Process Stop" },
        { value: "SEGREGATION", label: "Segregation" },
        { value: "QUARANTINE", label: "Quarantine" },
        { value: "NOTIFICATION", label: "Notification" },
        { value: "OTHER", label: "Other" },
      ],
    },
    { name: "dueDate", label: "Due Date", type: "date" },
    { name: "comments", label: "Comments", type: "textarea" },
  ];

  const linkedRecordFields: FieldDef[] = [
    {
      name: "linkedRecordType", label: "Record Type", type: "select", required: true,
      options: [
        { value: "CAPA", label: "CAPA" },
        { value: "RISK", label: "Risk" },
        { value: "CHANGE_CONTROL", label: "Change Control" },
        { value: "OOS_OOT", label: "OOS / OOT" },
        { value: "NCR", label: "Non-Conformance" },
        { value: "COMPLAINT", label: "Complaint" },
        { value: "AUDIT", label: "Audit" },
        { value: "SUPPLIER", label: "Supplier" },
        { value: "EQUIPMENT", label: "Equipment" },
        { value: "DOCUMENT", label: "Document" },
        { value: "TRAINING", label: "Training" },
        { value: "MATERIAL", label: "Material" },
        { value: "PRODUCT", label: "Product" },
        { value: "BATCH_RECORD", label: "Batch Record" },
      ],
    },
    { name: "linkedRecordId", label: "Record ID (numeric)", type: "number", required: true, placeholder: "e.g. 42" },
    { name: "linkedRecordNumber", label: "Record Number (optional)", type: "text", placeholder: "e.g. CAPA-2026-001" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb + header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/deviations" className="hover:underline">Deviations</Link>
            <span>/</span>
            <span>{d.deviationNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{d.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={deviationStatusVariant(d.status)}>{STATUS_LABELS[d.status]}</Badge>
            <Badge variant={deviationSeverityVariant(d.severity)}>{SEVERITY_LABELS[d.severity]}</Badge>
            {d.deviationType && (
              <Badge variant={d.deviationType === "UNPLANNED" ? "warning" : "neutral"}>
                {DEVIATION_TYPE_LABELS[d.deviationType]}
              </Badge>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(d.status === "DRAFT") && (
            <>
              <Button onClick={() => runAction("submit-for-investigation", "Submitted for investigation")} disabled={transition.isPending}>
                Submit Deviation
              </Button>
              <Button variant="ghost" onClick={() => setReasonAction({ action: "cancel", title: "Cancel Deviation", defaultReason: "Cancelled" })} disabled={transition.isPending}>
                Cancel
              </Button>
            </>
          )}
          {(d.status === "REPORTED" || d.status === "UNDER_INVESTIGATION" || d.status === "INVESTIGATION_IN_PROGRESS" || d.status === "REOPENED") && (
            <Button onClick={() => runAction("submit-for-approval", "Submitted for QA approval")} disabled={transition.isPending}>
              Submit for Approval
            </Button>
          )}
          {d.status === "PENDING_APPROVAL" && (
            <>
              <Button onClick={() => setApproveOpen(true)} disabled={approve.isPending}>Approve</Button>
              <Button variant="outline" onClick={() => setReasonAction({ action: "reject", title: "Reject Deviation", defaultReason: "Rejected" })} disabled={transition.isPending}>Reject</Button>
            </>
          )}
          {d.status === "APPROVED" && (
            <>
              <Button onClick={() => setReasonAction({ action: "close", title: "Close Deviation", defaultReason: "Deviation closed following QA approval" })} disabled={transition.isPending}>
                Close
              </Button>
              <Button variant="outline" onClick={() => setReopenOpen(true)} disabled={reopen.isPending}>Reopen</Button>
            </>
          )}
          {(d.status === "CLOSED" || d.status === "REJECTED" || d.status === "CANCELLED") && (
            <Button variant="outline" onClick={() => setReopenOpen(true)} disabled={reopen.isPending}>Reopen</Button>
          )}
        </div>
      </div>

      {/* ── Warning banners ── */}
      {d.severity === "CRITICAL" && (
        <div className="flex items-start gap-3 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-semibold">Critical deviation — immediate escalation may be required</p>
        </div>
      )}
      {d.severity === "MAJOR" && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="font-semibold">Major deviation — QA screening and impact assessment required</p>
        </div>
      )}
      {isInvOverdue && (
        <div className="flex items-start gap-3 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-semibold">Investigation is overdue — target date was {formatDate(d.targetInvestigationDueDate)}</p>
        </div>
      )}
      {isClosureOverdue && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="font-semibold">Target closure date has passed ({formatDate(d.targetClosureDueDate)})</p>
        </div>
      )}
      {(d.productAffected || d.batchAffected) && isOpen && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="font-semibold">Product or batch may be affected — impact assessment required</p>
        </div>
      )}
      {d.dataIntegrityImpactPossible && isOpen && (
        <div className="flex items-start gap-3 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-semibold">Data integrity impact possible — investigation required</p>
        </div>
      )}
      {d.capaRequired && isOpen && !capaLinked && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="font-semibold">CAPA is required — create or link a CAPA to proceed</p>
        </div>
      )}

      {/* ── Key info strip ── */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-body sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Deviation No." value={d.deviationNumber} />
          <Meta label="Category" value={d.category ? CATEGORY_LABELS[d.category] : "—"} />
          <Meta label="Department" value={d.department ?? "—"} />
          <Meta label="Severity" value={<Badge variant={deviationSeverityVariant(d.severity)}>{SEVERITY_LABELS[d.severity]}</Badge>} />
          <Meta label="Status" value={<Badge variant={deviationStatusVariant(d.status)}>{STATUS_LABELS[d.status]}</Badge>} />
          <Meta label="Investigation Due" value={d.targetInvestigationDueDate ? formatDate(d.targetInvestigationDueDate) : "—"} />
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 pt-2">
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "details", label: "Details" },
              { key: "containment", label: "Containment", count: ca.length },
              { key: "impact", label: "Impact Assessment" },
              { key: "investigation", label: "Investigation" },
              { key: "linked", label: "Linked Records", count: lr.length },
              { key: "closure", label: "Review & Closure" },
              { key: "trail", label: "Audit Trail" },
            ]}
          />
          <div className="ml-auto py-1 flex gap-2">
            {tab === "containment" && (
              <Button size="sm" variant="outline" onClick={() => setShowAddContainment(true)}>
                <Plus className="h-4 w-4" /> Add Action
              </Button>
            )}
            {tab === "linked" && (
              <Button size="sm" variant="outline" onClick={() => setShowAddLinked(true)}>
                <Plus className="h-4 w-4" /> Link Record
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
                <MetricCard label="Severity" value={SEVERITY_LABELS[d.severity]} color={d.severity === "CRITICAL" ? "text-error" : d.severity === "MAJOR" ? "text-warning" : "text-info"} />
                <MetricCard label="Risk Level" value={riskLevel ? RISK_LEVEL_LABELS[riskLevel] : "Not Assessed"} color={riskLevel === "CRITICAL" || riskLevel === "HIGH" ? "text-error" : riskLevel === "MEDIUM" ? "text-warning" : undefined} />
                <MetricCard label="Status" value={STATUS_LABELS[d.status]} />
                <MetricCard label="Days Open" value={age} suffix="d" color={age > 180 ? "text-error" : age > 90 ? "text-warning" : undefined} />
              </div>

              {/* Workflow progress checklist */}
              <div>
                <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">Workflow Progress</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckItem label="Deviation Reported" ok detail={`Registered as ${d.deviationNumber}`} />
                  <CheckItem
                    label="QA Screening"
                    ok={d.status !== "DRAFT" && d.status !== "REPORTED"}
                    detail={d.status === "DRAFT" ? "Not yet submitted" : d.status === "REPORTED" ? "Awaiting QA screening" : "Screened"}
                  />
                  <CheckItem
                    label="Containment Actions"
                    ok={hasContainment}
                    detail={hasContainment ? `${ca.length} action(s) recorded` : "No containment actions recorded"}
                  />
                  <CheckItem
                    label="Investigation"
                    ok={investigationComplete}
                    detail={investigationComplete ? "Investigation completed" : inv ? `Investigation ${inv.status.toLowerCase().replace("_", " ")}` : "Not started"}
                  />
                  <CheckItem
                    label="CAPA / Corrections"
                    ok={!d.capaRequired || capaLinked}
                    detail={d.capaRequired ? (capaLinked ? "CAPA linked" : "CAPA required but not linked") : "Not required"}
                  />
                  <CheckItem
                    label="QA Approval & Closure"
                    ok={d.status === "CLOSED" || d.status === "APPROVED"}
                    detail={d.status === "CLOSED" ? `Closed on ${formatDate(d.closedDate)}` : d.status === "APPROVED" ? "Approved — pending closure" : "Pending approval"}
                  />
                </div>
              </div>

              {/* Narrative */}
              <div className="space-y-3">
                <Block label="Description" value={d.description} />
                <Block label="Immediate Action" value={d.immediateAction} />
                <Block label="What Happened" value={d.whatHappened} />
                <Block label="Where Happened" value={d.whereHappened} />
                <Block label="How Detected" value={d.howDetected} />
                <Block label="Who Was Involved" value={d.whoInvolved} />
              </div>

              {/* Impact flags */}
              {(d.productAffected || d.materialAffected || d.batchAffected || d.equipmentAffected || d.supplierInvolved || d.customerImpactPossible || d.regulatoryImpactPossible || d.dataIntegrityImpactPossible) && (
                <div>
                  <h3 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted-foreground">Impact Flags</h3>
                  <div className="flex flex-wrap gap-2">
                    {d.productAffected && <Badge variant="warning">Product Affected</Badge>}
                    {d.materialAffected && <Badge variant="warning">Material Affected</Badge>}
                    {d.batchAffected && <Badge variant="error">Batch Affected</Badge>}
                    {d.equipmentAffected && <Badge variant="warning">Equipment Affected</Badge>}
                    {d.supplierInvolved && <Badge variant="neutral">Supplier Involved</Badge>}
                    {d.customerImpactPossible && <Badge variant="error">Customer Impact Possible</Badge>}
                    {d.regulatoryImpactPossible && <Badge variant="error">Regulatory Impact Possible</Badge>}
                    {d.dataIntegrityImpactPossible && <Badge variant="error">Data Integrity Impact Possible</Badge>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Details tab ── */}
          {tab === "details" && (
            <div className="space-y-6">
              {/* Classification */}
              <Section title="Classification">
                <DetailGrid>
                  <DetailItem label="Deviation Type" value={d.deviationType ? DEVIATION_TYPE_LABELS[d.deviationType] : "—"} />
                  <DetailItem label="Category" value={d.category ? CATEGORY_LABELS[d.category] : "—"} />
                  <DetailItem label="Related Module" value={d.relatedModule ?? "—"} />
                  <DetailItem label="Severity" value={<Badge variant={deviationSeverityVariant(d.severity)}>{SEVERITY_LABELS[d.severity]}</Badge>} />
                  <DetailItem label="Initial Risk Level" value={d.initialRiskLevel ? <Badge variant={deviationRiskVariant(d.initialRiskLevel)}>{RISK_LEVEL_LABELS[d.initialRiskLevel]}</Badge> : "—"} />
                  <DetailItem label="Final Risk Level" value={d.finalRiskLevel ? <Badge variant={deviationRiskVariant(d.finalRiskLevel)}>{RISK_LEVEL_LABELS[d.finalRiskLevel]}</Badge> : "—"} />
                </DetailGrid>
              </Section>
              {/* Dates */}
              <Section title="Dates">
                <DetailGrid>
                  <DetailItem label="Date Discovered" value={formatDate(d.dateDiscovered) || formatDate(d.occurredDate)} />
                  <DetailItem label="Date Reported" value={formatDate(d.dateReported)} />
                  <DetailItem label="Target Investigation Due" value={formatDate(d.targetInvestigationDueDate)} />
                  <DetailItem label="Target Closure Due" value={formatDate(d.targetClosureDueDate)} />
                  <DetailItem label="Closed Date" value={formatDate(d.closedDate)} />
                  <DetailItem label="Reopened At" value={formatDate(d.reopenedAt)} />
                </DetailGrid>
              </Section>
              {/* People */}
              <Section title="People">
                <DetailGrid>
                  <DetailItem label="Owner" value={d.ownerId ? (userMap.get(d.ownerId) ?? `User #${d.ownerId}`) : "—"} />
                  <DetailItem label="QA Owner" value={d.qaOwnerId ? (userMap.get(d.qaOwnerId) ?? `User #${d.qaOwnerId}`) : "—"} />
                  <DetailItem label="Reported By" value={d.reportedById ? (userMap.get(d.reportedById) ?? `User #${d.reportedById}`) : "—"} />
                  <DetailItem label="Site" value={d.site ?? "—"} />
                  <DetailItem label="Location" value={d.location ?? "—"} />
                  <DetailItem label="Department" value={d.department ?? "—"} />
                </DetailGrid>
              </Section>
              {/* Affected */}
              <Section title="Affected Items">
                <DetailGrid>
                  <DetailItem label="Product Affected" value={<Badge variant={d.productAffected ? "warning" : "neutral"}>{d.productAffected ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="Material Affected" value={<Badge variant={d.materialAffected ? "warning" : "neutral"}>{d.materialAffected ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="Batch Affected" value={<Badge variant={d.batchAffected ? "error" : "neutral"}>{d.batchAffected ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="Equipment Affected" value={<Badge variant={d.equipmentAffected ? "warning" : "neutral"}>{d.equipmentAffected ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="Supplier Involved" value={<Badge variant={d.supplierInvolved ? "info" : "neutral"}>{d.supplierInvolved ? "Yes" : "No"}</Badge>} />
                </DetailGrid>
              </Section>
              {/* Impact */}
              <Section title="Potential Impact">
                <DetailGrid>
                  <DetailItem label="Customer / Patient Impact" value={<Badge variant={d.customerImpactPossible ? "error" : "neutral"}>{d.customerImpactPossible ? "Possible" : "No"}</Badge>} />
                  <DetailItem label="Regulatory Impact" value={<Badge variant={d.regulatoryImpactPossible ? "error" : "neutral"}>{d.regulatoryImpactPossible ? "Possible" : "No"}</Badge>} />
                  <DetailItem label="Data Integrity Impact" value={<Badge variant={d.dataIntegrityImpactPossible ? "error" : "neutral"}>{d.dataIntegrityImpactPossible ? "Possible" : "No"}</Badge>} />
                </DetailGrid>
              </Section>
              {/* Workflow flags */}
              <Section title="Workflow Flags">
                <DetailGrid>
                  <DetailItem label="Containment Required" value={<Badge variant={d.containmentRequired ? "warning" : "neutral"}>{d.containmentRequired ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="Investigation Required" value={<Badge variant={d.investigationRequired ? "info" : "neutral"}>{d.investigationRequired ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="CAPA Required" value={<Badge variant={d.capaRequired ? "warning" : "neutral"}>{d.capaRequired ? "Yes" : "No"}</Badge>} />
                  <DetailItem label="Change Control Required" value={<Badge variant={d.changeControlRequired ? "info" : "neutral"}>{d.changeControlRequired ? "Yes" : "No"}</Badge>} />
                </DetailGrid>
              </Section>
            </div>
          )}

          {/* ── Containment tab ── */}
          {tab === "containment" && (
            <div className="space-y-4">
              {containmentActions.isLoading ? (
                <p className="text-body text-muted-foreground">Loading containment actions…</p>
              ) : ca.length === 0 ? (
                <Empty text="No containment actions recorded.">
                  <Button size="sm" onClick={() => setShowAddContainment(true)}><Plus className="h-4 w-4" /> Add Containment Action</Button>
                </Empty>
              ) : (
                <>
                  {/* Stat pills */}
                  <div className="flex flex-wrap gap-2">
                    <StatPill label="Total" value={ca.length} />
                    <StatPill label="Completed" value={ca.filter((a: ContainmentActionResponse) => a.status === "COMPLETED").length} />
                    <StatPill label="In Progress" value={ca.filter((a: ContainmentActionResponse) => a.status === "IN_PROGRESS").length} />
                    <StatPill label="Overdue" value={ca.filter((a: ContainmentActionResponse) => a.status === "OVERDUE").length} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-body">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-left">
                          <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Type</th>
                          <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Description</th>
                          <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Owner</th>
                          <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Due Date</th>
                          <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ca.map((a: ContainmentActionResponse) => (
                          <tr key={a.id} className="border-b border-border last:border-0">
                            <td className="py-2 pr-4 whitespace-nowrap">{containmentTypeLabel(a.actionType)}</td>
                            <td className="py-2 pr-4 max-w-[280px]">{a.description}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">{a.ownerId ? (userMap.get(a.ownerId) ?? `User #${a.ownerId}`) : "—"}</td>
                            <td className="py-2 pr-4 whitespace-nowrap">{formatDate(a.dueDate)}</td>
                            <td className="py-2 pr-4">
                              <Badge variant={containmentStatusVariant(a.status)}>{containmentStatusLabel(a.status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Impact Assessment tab ── */}
          {tab === "impact" && (
            <div className="space-y-6">
              {impactAssessment.isLoading ? (
                <p className="text-body text-muted-foreground">Loading impact assessment…</p>
              ) : (
                <>
                  {impact && (
                    <div className="flex items-center gap-3">
                      <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Overall Impact</p>
                      <Badge variant={
                        impact.overallImpact === "CRITICAL_IMPACT" ? "error" :
                        impact.overallImpact === "HIGH_IMPACT" ? "error" :
                        impact.overallImpact === "MEDIUM_IMPACT" ? "warning" :
                        impact.overallImpact === "LOW_IMPACT" ? "info" :
                        "neutral"
                      }>
                        {impact.overallImpact?.replace("_", " ") ?? "Not assessed"}
                      </Badge>
                    </div>
                  )}

                  {/* Quality impact section */}
                  <ImpactSection
                    title="Quality Impact"
                    fields={[
                      { label: "Product Quality Affected", key: "productQualityAffected" },
                      { label: "Material Quality Affected", key: "materialQualityAffected" },
                      { label: "Process Quality Affected", key: "processQualityAffected" },
                      { label: "Specification Impact", key: "specificationImpact" },
                      { label: "Batch / Lot Impact", key: "batchLotImpact" },
                    ]}
                    commentsKey="qualityComments"
                    values={impactValues}
                    onChange={(k, v) => setImpactValues((prev) => ({ ...prev, [k]: v }))}
                  />

                  {/* Safety impact */}
                  <ImpactSection
                    title="Safety Impact"
                    fields={[
                      { label: "Customer Impact", key: "customerImpact" },
                      { label: "Patient Safety Impact", key: "patientSafetyImpact" },
                      { label: "Complaint Risk", key: "complaintRisk" },
                      { label: "Recall Risk", key: "recallRisk" },
                    ]}
                    commentsKey="safetyComments"
                    values={impactValues}
                    onChange={(k, v) => setImpactValues((prev) => ({ ...prev, [k]: v }))}
                  />

                  {/* Regulatory impact */}
                  <ImpactSection
                    title="Regulatory / Compliance Impact"
                    fields={[
                      { label: "Regulatory Impact", key: "regulatoryImpact" },
                      { label: "Reportable Event", key: "reportableEvent" },
                      { label: "Inspection / Audit Impact", key: "inspectionAuditImpact" },
                    ]}
                    commentsKey="complianceComments"
                    values={impactValues}
                    onChange={(k, v) => setImpactValues((prev) => ({ ...prev, [k]: v }))}
                  />

                  {/* Data integrity */}
                  <ImpactSection
                    title="Data Integrity Impact"
                    fields={[
                      { label: "Original Record Affected", key: "originalRecordAffected" },
                      { label: "Missing / Incomplete Data", key: "missingIncompleteData" },
                      { label: "Unauthorized Change", key: "unauthorizedChange" },
                      { label: "Traceability Affected", key: "traceabilityAffected" },
                    ]}
                    commentsKey="dataIntegrityComments"
                    values={impactValues}
                    onChange={(k, v) => setImpactValues((prev) => ({ ...prev, [k]: v }))}
                  />

                  {/* Overall */}
                  <div className="space-y-3 rounded-md border border-border p-4">
                    <p className="font-semibold">Overall Assessment</p>
                    <div className="space-y-1.5">
                      <p className="text-label text-muted-foreground">Overall Impact</p>
                      <Select
                        value={impactValues.overallImpact ?? ""}
                        onChange={(e) => setImpactValues((prev) => ({ ...prev, overallImpact: e.target.value }))}
                      >
                        <option value="">Select overall impact…</option>
                        <option value="NO_IMPACT">No Impact</option>
                        <option value="LOW_IMPACT">Low Impact</option>
                        <option value="MEDIUM_IMPACT">Medium Impact</option>
                        <option value="HIGH_IMPACT">High Impact</option>
                        <option value="CRITICAL_IMPACT">Critical Impact</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-label text-muted-foreground">Conclusion</p>
                      <Textarea
                        rows={3}
                        placeholder="Summary conclusion of the impact assessment"
                        value={impactValues.conclusion ?? ""}
                        onChange={(e) => setImpactValues((prev) => ({ ...prev, conclusion: e.target.value }))}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={upsertImpact.isPending}
                      onClick={async () => {
                        try {
                          await upsertImpact.mutateAsync({ deviationId: id, ...impactValues });
                          toast.success("Impact assessment saved");
                        } catch { /* interceptor */ }
                      }}
                    >
                      {upsertImpact.isPending ? "Saving…" : "Save Impact Assessment"}
                    </Button>
                  </div>

                  {!impact && (
                    <Empty text="No impact assessment recorded yet.">
                      <Button size="sm" onClick={async () => {
                        try {
                          await upsertImpact.mutateAsync({ deviationId: id, assessmentStatus: "IN_PROGRESS" });
                          toast.success("Impact assessment started");
                        } catch { /* interceptor */ }
                      }}>
                        Start Assessment
                      </Button>
                    </Empty>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Investigation tab ── */}
          {tab === "investigation" && (
            <div className="space-y-4">
              {investigation.isLoading ? (
                <p className="text-body text-muted-foreground">Loading investigation…</p>
              ) : (
                <>
                  {inv && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={inv.status === "COMPLETED" ? "success" : inv.status === "IN_PROGRESS" || inv.status === "PENDING_REVIEW" ? "info" : "neutral"}>
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Investigation Owner</p>
                      <Select
                        value={invValues.investigationOwnerId ?? ""}
                        onChange={(e) => setInvValues((p) => ({ ...p, investigationOwnerId: e.target.value }))}
                      >
                        {userOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                      <Select
                        value={invValues.status ?? "NOT_STARTED"}
                        onChange={(e) => setInvValues((p) => ({ ...p, status: e.target.value }))}
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="REJECTED">Rejected</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Start Date</p>
                      <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 text-body" value={invValues.startDate ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Due Date</p>
                      <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 text-body" value={invValues.dueDate ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, dueDate: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Investigation Summary</p>
                    <Textarea rows={4} placeholder="Summary of investigation findings" value={invValues.summary ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, summary: e.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Evidence Reviewed</p>
                    <Textarea rows={3} placeholder="Documents, records, or evidence reviewed during investigation" value={invValues.evidenceReviewed ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, evidenceReviewed: e.target.value }))} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Root Cause Category</p>
                      <Select
                        value={invValues.rootCauseCategory ?? ""}
                        onChange={(e) => setInvValues((p) => ({ ...p, rootCauseCategory: e.target.value }))}
                      >
                        <option value="">Select category…</option>
                        <option value="HUMAN_ERROR">Human Error</option>
                        <option value="PROCESS_FAILURE">Process Failure</option>
                        <option value="EQUIPMENT_FAILURE">Equipment Failure</option>
                        <option value="MATERIAL_ISSUE">Material Issue</option>
                        <option value="SUPPLIER_ISSUE">Supplier Issue</option>
                        <option value="METHOD_PROCEDURE_GAP">Method / Procedure Gap</option>
                        <option value="TRAINING_GAP">Training Gap</option>
                        <option value="DOCUMENTATION_GAP">Documentation Gap</option>
                        <option value="ENVIRONMENTAL_ISSUE">Environmental Issue</option>
                        <option value="SYSTEM_SOFTWARE_ISSUE">System / Software Issue</option>
                        <option value="DATA_INTEGRITY_ISSUE">Data Integrity Issue</option>
                        <option value="UNKNOWN_INCONCLUSIVE">Unknown / Inconclusive</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Analysis Method</p>
                      <Select
                        value={invValues.analysisMethod ?? ""}
                        onChange={(e) => setInvValues((p) => ({ ...p, analysisMethod: e.target.value }))}
                      >
                        <option value="">Select method…</option>
                        <option value="FIVE_WHYS">Five Whys</option>
                        <option value="FISHBONE">Fishbone / Ishikawa</option>
                        <option value="FAULT_TREE">Fault Tree Analysis</option>
                        <option value="PROCESS_MAPPING">Process Mapping</option>
                        <option value="HUMAN_ERROR_ANALYSIS">Human Error Analysis</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Root Cause Description</p>
                    <Textarea rows={4} placeholder="Describe the root cause identified" value={invValues.rootCauseDescription ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, rootCauseDescription: e.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Contributing Factors</p>
                    <Textarea rows={3} placeholder="Contributing factors that led to or aggravated the deviation" value={invValues.contributingFactors ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, contributingFactors: e.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Most Probable Root Cause</p>
                    <Textarea rows={3} placeholder="Statement of the most probable root cause" value={invValues.mostProbableRootCause ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, mostProbableRootCause: e.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-label font-semibold text-muted-foreground uppercase tracking-wide">Investigation Conclusion</p>
                    <Textarea rows={4} placeholder="Overall conclusion and recommendations" value={invValues.investigationConclusion ?? ""} onChange={(e) => setInvValues((p) => ({ ...p, investigationConclusion: e.target.value }))} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      disabled={upsertInvestigation.isPending}
                      onClick={async () => {
                        try {
                          await upsertInvestigation.mutateAsync({ deviationId: id, ...invValues });
                          toast.success("Investigation saved");
                        } catch { /* interceptor */ }
                      }}
                    >
                      {upsertInvestigation.isPending ? "Saving…" : "Save Investigation"}
                    </Button>
                  </div>

                  {!inv && (
                    <Empty text="No investigation started yet.">
                      <Button size="sm" onClick={async () => {
                        try {
                          await upsertInvestigation.mutateAsync({ deviationId: id, status: "IN_PROGRESS" });
                          toast.success("Investigation started");
                        } catch { /* interceptor */ }
                      }}>
                        Start Investigation
                      </Button>
                    </Empty>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Linked Records tab ── */}
          {tab === "linked" && (
            <div className="space-y-4">
              {linkedRecords.isLoading ? (
                <p className="text-body text-muted-foreground">Loading linked records…</p>
              ) : lr.length === 0 ? (
                <Empty text="No records linked.">
                  <Button size="sm" onClick={() => setShowAddLinked(true)}><Plus className="h-4 w-4" /> Link Record</Button>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left">
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Type</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Record No.</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Notes</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Date Linked</th>
                        <th className="py-2 text-label uppercase tracking-wide text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lr.map((r: LinkedRecordResponse) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <Badge variant="neutral">{r.linkedRecordType.replace("_", " ")}</Badge>
                          </td>
                          <td className="py-2 pr-4">{r.linkedRecordNumber ?? `#${r.linkedRecordId}`}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{r.notes ?? "—"}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</td>
                          <td className="py-2">
                            <button
                              onClick={async () => {
                                try {
                                  await removeLinked.mutateAsync({ deviationId: id, linkId: r.id });
                                  toast.success("Record unlinked");
                                } catch { /* interceptor */ }
                              }}
                              className="text-error hover:underline text-label"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Review & Closure tab ── */}
          {tab === "closure" && (
            <div className="space-y-6">
              <h3 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Closure Readiness Checklist</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CheckItem
                  label="Deviation details complete"
                  ok={!!d.description && !!d.severity}
                  detail={d.description ? "Description recorded" : "Description required"}
                />
                <CheckItem
                  label="Containment assessed"
                  ok={hasContainment || !d.containmentRequired}
                  detail={d.containmentRequired ? (hasContainment ? `${ca.length} action(s) recorded` : "Containment required but not recorded") : "Not required"}
                />
                <CheckItem
                  label="Investigation completed"
                  ok={investigationComplete || !d.investigationRequired}
                  detail={d.investigationRequired ? (investigationComplete ? "Investigation completed" : "Investigation required but not completed") : "Not required"}
                />
                <CheckItem
                  label="Root cause documented"
                  ok={rootCauseDoc || !d.investigationRequired}
                  detail={d.investigationRequired ? (rootCauseDoc ? "Root cause documented" : "Root cause not documented") : "Not required"}
                />
                <CheckItem
                  label="CAPA created / justified"
                  ok={!d.capaRequired || capaLinked}
                  detail={d.capaRequired ? (capaLinked ? "CAPA linked" : "CAPA required but not linked") : "Not required"}
                />
                <CheckItem
                  label="QA approval obtained"
                  ok={d.status === "APPROVED" || d.status === "CLOSED"}
                  detail={d.status === "APPROVED" ? "QA approved" : d.status === "CLOSED" ? "Closed" : "Pending QA approval"}
                />
              </div>
              {d.status === "CLOSED" && (
                <div className="rounded-md border border-success/30 bg-success/5 p-4">
                  <p className="font-semibold text-success">Deviation Closed</p>
                  <p className="text-label text-muted-foreground">Closed on {formatDate(d.closedDate)}</p>
                </div>
              )}
              {(d.status === "UNDER_INVESTIGATION" || d.status === "INVESTIGATION_IN_PROGRESS" || d.status === "REOPENED" || d.status === "REPORTED") && (
                <Button
                  onClick={() => runAction("submit-for-approval", "Submitted for QA approval after investigation")}
                  disabled={transition.isPending}
                >
                  Submit for QA Approval
                </Button>
              )}
            </div>
          )}

          {/* ── Audit Trail tab ── */}
          {tab === "trail" && (
            <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
          )}
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Deviation"
        recordNumber={d.deviationNumber}
        recordTitle={d.title}
        recordNoun="deviation"
        statusNode={<Badge variant={deviationStatusVariant(d.status)}>{STATUS_LABELS[d.status]}</Badge>}
        isPending={approve.isPending}
        successMessage="Deviation approved"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: d.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
        }}
      />

      <ReasonModal
        open={!!reasonAction}
        onOpenChange={(open) => !open && setReasonAction(null)}
        title={reasonAction?.title ?? "Workflow Action"}
        defaultReason={reasonAction?.defaultReason ?? ""}
        submitLabel="Confirm"
        isPending={transition.isPending}
        onSubmit={async (reason) => {
          if (!reasonAction) return;
          await transition.mutateAsync({ id, action: reasonAction.action, expectedVersion: d.version, reason });
        }}
      />

      <ReasonModal
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen Deviation"
        defaultReason="Deviation reopened for further investigation"
        submitLabel="Reopen"
        isPending={reopen.isPending}
        onSubmit={async (reason) => {
          await reopen.mutateAsync({ id, expectedVersion: d.version, reason });
        }}
      />

      <ActionFormModal
        open={showAddContainment}
        onOpenChange={setShowAddContainment}
        title="Add Containment Action"
        isPending={addContainment.isPending}
        successMessage="Containment action added"
        fields={containmentFields}
        onSubmit={async (values) => {
          await addContainment.mutateAsync({
            deviationId: id,
            description: values.description,
            actionType: values.actionType,
            dueDate: values.dueDate || undefined,
            comments: values.comments || undefined,
          });
        }}
      />

      <ActionFormModal
        open={showAddLinked}
        onOpenChange={setShowAddLinked}
        title="Link Record"
        isPending={addLinked.isPending}
        successMessage="Record linked"
        fields={linkedRecordFields}
        onSubmit={async (values) => {
          await addLinked.mutateAsync({
            deviationId: id,
            linkedRecordType: values.linkedRecordType,
            linkedRecordId: Number(values.linkedRecordId),
            linkedRecordNumber: values.linkedRecordNumber || undefined,
            notes: values.notes || undefined,
          });
        }}
      />
    </div>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="mt-0.5 font-medium">{value ?? "—"}</div>
    </div>
  );
}

function ImpactSection({
  title,
  fields,
  commentsKey,
  values,
  onChange,
}: {
  title: string;
  fields: { label: string; key: string }[];
  commentsKey: string;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <p className="font-semibold">{title}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <p className="text-label text-muted-foreground">{f.label}</p>
            <Select
              value={values[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
            >
              <option value="">Select…</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="UNKNOWN">Unknown</option>
            </Select>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-label text-muted-foreground">Comments</p>
        <Textarea
          rows={2}
          placeholder="Additional comments…"
          value={values[commentsKey] ?? ""}
          onChange={(e) => onChange(commentsKey, e.target.value)}
        />
      </div>
    </div>
  );
}
