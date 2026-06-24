"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  useAudit,
  useAuditTrail,
  useAuditChecklist,
  useAuditEvidence,
  useAuditFindings,
  useAuditActionPlans,
  useAuditMeetings,
  useAuditLinkedRecords,
  useAuditAction,
  useCloseAudit,
  useReopenAudit,
  useAddChecklistItem,
  useUpdateChecklistItem,
  useAddEvidence,
  useAddFinding,
  useUpdateFinding,
  useAcknowledgeFinding,
  useCloseFinding,
  useAddActionPlan,
  useUpdateActionPlan,
  useAddMeeting,
  useAddLinkedRecord,
  useRemoveLinkedRecord,
  useCreateCapaFromFinding,
} from "@/hooks/useAudit";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ReasonModal } from "@/components/common/ReasonModal";
import { ActionFormModal, type FieldDef } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import {
  AUDIT_STATUS_LABELS,
  AUDIT_TYPE_LABELS,
  FINDING_TYPE_LABELS,
  FINDING_STATUS_LABELS,
  FINDING_SEVERITY_LABELS,
  ACTION_PLAN_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  auditStatusVariant,
  findingTypeVariant,
  findingSeverityVariant,
  findingStatusVariant,
  actionPlanStatusVariant,
  riskLevelVariant,
  ageInDays,
  auditOverdueCheck,
  type AuditFinding,
  type AuditChecklistItem,
  type AuditActionPlan,
  type AuditMeeting,
  type AuditLinkedRecord,
  type FindingSeverity,
} from "@/types/audit";
import { cn } from "@/lib/utils";
// types
type TabKey =
  | "overview"
  | "plan"
  | "checklist"
  | "evidence"
  | "findings"
  | "action-plans"
  | "meetings"
  | "linked"
  | "trail";

type FormModal =
  | null
  | "addChecklist"
  | "addEvidence"
  | "addFinding"
  | "addAction"
  | "addMeeting"
  | "linkRecord";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "plan", label: "Audit Plan" },
  { key: "checklist", label: "Checklist" },
  { key: "evidence", label: "Execution & Evidence" },
  { key: "findings", label: "Findings" },
  { key: "action-plans", label: "Action Plans" },
  { key: "meetings", label: "Meetings" },
  { key: "linked", label: "Linked Records" },
  { key: "trail", label: "Audit Trail" },
];

// helpers
function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{value ?? "—"}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value ?? "—"}</p>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function checklistResponseVariant(r: string): "success" | "error" | "warning" | "info" | "neutral" {
  switch (r) {
    case "CONFORMING": return "success";
    case "NONCONFORMING": return "error";
    case "OBSERVATION": return "warning";
    case "OFI": return "info";
    default: return "neutral";
  }
}

function checklistResponseLabel(r: string): string {
  switch (r) {
    case "CONFORMING": return "Conforming";
    case "NONCONFORMING": return "Nonconforming";
    case "NOT_APPLICABLE": return "N/A";
    case "NOT_CHECKED": return "Not Checked";
    case "OBSERVATION": return "Observation";
    case "OFI": return "OFI";
    default: return r;
  }
}

// page wrapper
export default function AuditDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading…" />}>
      <AuditDetailContent />
    </Suspense>
  );
}
// main content
function AuditDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const audit = useAudit(id);
  const trail = useAuditTrail(id);
  const checklistQuery = useAuditChecklist(id);
  const evidenceQuery = useAuditEvidence(id);
  const findingsQuery = useAuditFindings(id);
  const actionPlansQuery = useAuditActionPlans(id);
  const meetingsQuery = useAuditMeetings(id);
  const linkedQuery = useAuditLinkedRecords(id);

  const action = useAuditAction(id);
  const closeAudit = useCloseAudit(id);
  const reopenAudit = useReopenAudit(id);
  const addChecklistItem = useAddChecklistItem(id);
  const updateChecklistItem = useUpdateChecklistItem(id);
  const addEvidence = useAddEvidence(id);
  const addFinding = useAddFinding(id);
  const updateFinding = useUpdateFinding(id);
  const acknowledgeFinding = useAcknowledgeFinding(id);
  const closeFinding = useCloseFinding(id);
  const addActionPlan = useAddActionPlan(id);
  const updateActionPlan = useUpdateActionPlan(id);
  const addMeeting = useAddMeeting(id);
  const addLinkedRecord = useAddLinkedRecord(id);
  const removeLinkedRecord = useRemoveLinkedRecord(id);
  const createCapaFromFinding = useCreateCapaFromFinding(id);

  const tab = (searchParams.get("tab") as TabKey) ?? "overview";
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [modal, setModal] = useState<FormModal>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);

  if (audit.isLoading) return <LoadingScreen label="Loading audit..." />;
  if (audit.isError || !audit.data) return <ErrorAlert title="Error" message="Failed to load this audit." />;

  const a = audit.data;

  const findings = findingsQuery.data ?? a.findings ?? [];
  const checklist = checklistQuery.data ?? [];
  const evidence = evidenceQuery.data ?? [];
  const actionPlans = actionPlansQuery.data ?? [];
  const meetings = meetingsQuery.data ?? [];
  const linkedRecords = linkedQuery.data ?? [];

  const findingsTotal = findings.length;
  const majorCritical = findings.filter(
    (f: AuditFinding) => f.findingType === "MAJOR_NC" || f.findingType === "CRITICAL_NC"
  ).length;
  const openActions = actionPlans.filter(
    (ap: AuditActionPlan) =>
      ap.status !== "CLOSED" && ap.status !== "CANCELLED" &&
      ap.status !== "COMPLETED" && ap.status !== "VERIFIED"
  ).length;
  const auditAge = ageInDays(a.createdAt);
  const isOverdue = auditOverdueCheck(a);

  const checklistCompleted = checklist.filter(
    (i: AuditChecklistItem) => i.response && i.response !== "NOT_CHECKED"
  ).length;
  const checklistPct = checklist.length ? Math.round((checklistCompleted / checklist.length) * 100) : 0;

  const groupedLinked = linkedRecords.reduce(
    (acc: Record<string, AuditLinkedRecord[]>, r: AuditLinkedRecord) => {
      const key = r.recordType ?? "OTHER";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {}
  );
  const checklistFields: FieldDef[] = [
    { name: "section", label: "Section", type: "text", placeholder: "e.g. 4.1 Document Control" },
    { name: "requirementReference", label: "Requirement Reference", type: "text", placeholder: "e.g. ISO 9001:2015" },
    { name: "question", label: "Question", type: "textarea", required: true, placeholder: "What needs to be verified?" },
    { name: "expectedEvidence", label: "Expected Evidence", type: "textarea", placeholder: "Documents, records, or observations expected" },
    {
      name: "checklistMethod", label: "Method", type: "select",
      options: [
        { value: "INTERVIEW", label: "Interview" },
        { value: "OBSERVATION", label: "Observation" },
        { value: "RECORD_REVIEW", label: "Record Review" },
        { value: "DOCUMENT_REVIEW", label: "Document Review" },
        { value: "SAMPLING", label: "Sampling" },
        { value: "SYSTEM_REVIEW", label: "System Review" },
      ],
    },
    { name: "sortOrder", label: "Sort Order", type: "number", placeholder: "e.g. 10" },
  ];

  const evidenceFields: FieldDef[] = [
    {
      name: "evidenceType", label: "Evidence Type", type: "select", required: true,
      options: [
        { value: "DOCUMENT", label: "Document" },
        { value: "RECORD", label: "Record" },
        { value: "INTERVIEW", label: "Interview" },
        { value: "OBSERVATION", label: "Observation" },
        { value: "PHOTO", label: "Photo" },
        { value: "SCREENSHOT", label: "Screenshot" },
        { value: "SYSTEM_LOG", label: "System Log" },
        { value: "OTHER", label: "Other" },
      ],
    },
    { name: "description", label: "Description", type: "textarea", required: true, placeholder: "Describe the evidence collected" },
    { name: "referenceNumber", label: "Reference Number", type: "text", placeholder: "e.g. DOC-001" },
    { name: "areaAudited", label: "Area Audited", type: "text", placeholder: "e.g. Warehouse, QC Lab" },
    { name: "personInterviewed", label: "Person Interviewed", type: "text", placeholder: "Name and role" },
    { name: "auditorNotes", label: "Auditor Notes", type: "textarea", placeholder: "Additional observations or context" },
  ];

  const findingFields: FieldDef[] = [
    { name: "title", label: "Title", type: "text", placeholder: "Short finding title" },
    { name: "description", label: "Description", type: "textarea", required: true, placeholder: "Describe the finding in detail" },
    {
      name: "findingType", label: "Finding Type", type: "select",
      options: [
        { value: "CONFORMITY", label: "Conformity" },
        { value: "OBSERVATION", label: "Observation" },
        { value: "OPPORTUNITY_FOR_IMPROVEMENT", label: "Opportunity for Improvement" },
        { value: "MINOR_NC", label: "Minor Nonconformity" },
        { value: "MAJOR_NC", label: "Major Nonconformity" },
        { value: "CRITICAL_NC", label: "Critical Nonconformity" },
        { value: "GOOD_PRACTICE", label: "Good Practice" },
      ],
    },
    { name: "area", label: "Area / Process", type: "text", placeholder: "e.g. QC Lab" },
    {
      name: "severity", label: "Severity", type: "select", required: true,
      options: [
        { value: "MINOR", label: "Minor" },
        { value: "MAJOR", label: "Major" },
        { value: "CRITICAL", label: "Critical" },
      ],
    },
    {
      name: "riskLevel", label: "Risk Level", type: "select",
      options: [
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
        { value: "CRITICAL", label: "Critical" },
      ],
    },
    { name: "requirementReference", label: "Requirement Reference", type: "text", placeholder: "e.g. GMP Annex 11" },
    { name: "evidence", label: "Evidence", type: "textarea", placeholder: "Evidence supporting this finding" },
    {
      name: "capaRequired", label: "CAPA Required?", type: "select",
      options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }],
    },
  ];

  const actionPlanFields: FieldDef[] = [
    {
      name: "actionType", label: "Action Type", type: "select", required: true,
      options: [
        { value: "CORRECTION", label: "Correction" },
        { value: "CORRECTIVE_ACTION", label: "Corrective Action" },
        { value: "PREVENTIVE_ACTION", label: "Preventive Action" },
        { value: "CONTAINMENT", label: "Containment" },
        { value: "TRAINING", label: "Training" },
        { value: "DOCUMENT_UPDATE", label: "Document Update" },
        { value: "PROCESS_CHANGE", label: "Process Change" },
        { value: "SUPPLIER_ACTION", label: "Supplier Action" },
        { value: "EQUIPMENT_ACTION", label: "Equipment Action" },
        { value: "RISK_REVIEW", label: "Risk Review" },
        { value: "OTHER", label: "Other" },
      ],
    },
    { name: "description", label: "Description", type: "textarea", required: true, placeholder: "Describe the action to be taken" },
    { name: "dueDate", label: "Due Date", type: "date" },
    {
      name: "priority", label: "Priority", type: "select",
      options: [
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
        { value: "CRITICAL", label: "Critical" },
      ],
    },
    {
      name: "effectivenessCheckRequired", label: "Effectiveness Check Required?", type: "select",
      options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }],
    },
    { name: "comments", label: "Comments", type: "textarea" },
  ];

  const meetingFields: FieldDef[] = [
    {
      name: "meetingType", label: "Meeting Type", type: "select", required: true,
      options: [
        { value: "OPENING_MEETING", label: "Opening Meeting" },
        { value: "DAILY_DEBRIEF", label: "Daily Debrief" },
        { value: "CLOSING_MEETING", label: "Closing Meeting" },
        { value: "FOLLOW_UP_MEETING", label: "Follow-Up Meeting" },
      ],
    },
    { name: "meetingDateTime", label: "Date & Time", type: "text", placeholder: "YYYY-MM-DDTHH:MM" },
    { name: "attendees", label: "Attendees", type: "text", placeholder: "Names and roles" },
    { name: "agenda", label: "Agenda", type: "textarea" },
    { name: "discussionSummary", label: "Discussion Summary", type: "textarea" },
  ];

  const linkedRecordFields: FieldDef[] = [
    {
      name: "recordType", label: "Record Type", type: "select", required: true,
      options: [
        { value: "CAPA", label: "CAPA" },
        { value: "DEVIATION", label: "Deviation" },
        { value: "NCR", label: "Non-Conformance" },
        { value: "RISK", label: "Risk" },
        { value: "CHANGE_CONTROL", label: "Change Control" },
        { value: "SUPPLIER", label: "Supplier" },
        { value: "EQUIPMENT", label: "Equipment" },
        { value: "DOCUMENT", label: "Document" },
        { value: "TRAINING", label: "Training" },
        { value: "MATERIAL", label: "Material" },
        { value: "PRODUCT", label: "Product" },
        { value: "BATCH_RECORD", label: "Batch Record" },
        { value: "OOS", label: "OOS" },
        { value: "COMPLAINT", label: "Complaint" },
      ],
    },
    { name: "recordId", label: "Record ID (numeric)", type: "text", required: true, placeholder: "e.g. 42" },
    { name: "recordReference", label: "Record Reference", type: "text", placeholder: "e.g. CAPA-2026-001" },
    { name: "recordTitle", label: "Record Title", type: "text" },
    { name: "notes", label: "Notes", type: "text" },
  ];
  return (
    <div className="space-y-4">
      {/* breadcrumb + header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/audits" className="hover:underline">Audits</Link>
            <span>/</span>
            <span className="text-foreground">{a.auditNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{a.auditTitle}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={auditStatusVariant(a.status)}>{AUDIT_STATUS_LABELS[a.status] ?? a.status}</Badge>
            <Badge variant="neutral">{AUDIT_TYPE_LABELS[a.auditType as keyof typeof AUDIT_TYPE_LABELS] ?? a.auditType}</Badge>
            {a.riskLevel && (
              <Badge variant={riskLevelVariant(a.riskLevel)}>
                {RISK_LEVEL_LABELS[a.riskLevel as keyof typeof RISK_LEVEL_LABELS] ?? a.riskLevel} Risk
              </Badge>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!["CLOSED","CANCELLED","ARCHIVED","COMPLETED"].includes(a.status) && (
            <Button variant="outline" onClick={() => setCloseOpen(true)}>Close Audit</Button>
          )}
          {["CLOSED","COMPLETED"].includes(a.status) && (
            <Button variant="outline" onClick={() => setReopenOpen(true)}>Reopen</Button>
          )}
          {a.status === "IN_PROGRESS" && (
            <Button onClick={() => setFinalizeOpen(true)}>Finalize Audit</Button>
          )}
          {!["CLOSED","CANCELLED","ARCHIVED","COMPLETED","FOLLOW_UP"].includes(a.status) && (
            <Button variant="ghost" onClick={() => setCancelOpen(true)}>Cancel</Button>
          )}
        </div>
      </div>

      {/* key info strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 rounded-lg border border-border bg-muted/30 p-4">
        <Meta label="Audit No." value={a.auditNo} />
        <Meta label="Department" value={a.department ?? a.processArea ?? "—"} />
        <Meta label="Site" value={a.site ?? "—"} />
        <Meta label="Planned Start" value={formatDate(a.plannedStartDate)} />
        <Meta label="Planned End" value={<span className={cn(isOverdue && "text-error font-semibold")}>{formatDate(a.plannedEndDate) ?? "—"}</span>} />
        <Meta label="Closure" value={a.closureStatus ?? "Not Closed"} />
      </div>

      {/* warning banners */}
      {isOverdue && (
        <div className="flex items-start gap-3 rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <p><strong>Audit Overdue</strong> --- The planned end date has passed. Please update the audit schedule or complete the audit.</p>
        </div>
      )}
      {findings.some((f: AuditFinding) => (f.findingType === "MAJOR_NC" || f.findingType === "CRITICAL_NC") && f.findingStatus !== "CLOSED") && (
        <div className="flex items-start gap-3 rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <p><strong>Open Major / Critical Findings</strong> --- This audit has unresolved major or critical nonconformities. CAPA may be required.</p>
        </div>
      )}
      {["REPORT_DRAFT","REPORT_SUBMITTED"].includes(a.status) && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-body text-[#8A6D00]">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <p><strong>Report Pending</strong> --- The audit report is awaiting review or approval.</p>
        </div>
      )}

      {/* tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((t) => (
          <Link key={t.key} href={`?tab=${t.key}`}
            className={cn("shrink-0 border-b-2 px-4 py-2.5 text-body font-medium transition-colors",
              tab === t.key ? "border-brand-primary text-brand-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* tab content */}
      <Card>
        <CardContent className="pt-4">
          {/* Tab 1: Overview */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Total Findings" value={findingsTotal} />
                <MetricCard label="Critical / Major" value={majorCritical} color={majorCritical > 0 ? "text-error" : "text-brand-primary"} />
                <MetricCard label="Open Actions" value={openActions} color={openActions > 0 ? "text-warning" : "text-brand-primary"} />
                <MetricCard label="Audit Age" value={auditAge} suffix="d" color={auditAge > 90 ? "text-error" : auditAge > 60 ? "text-warning" : undefined} />
              </div>
              <div>
                <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">Workflow Progress</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckItem label="Audit Created" ok detail={`Registered as ${a.auditNo}`} />
                  <CheckItem label="Audit Planned" ok={a.status !== "DRAFT"} detail={a.status === "DRAFT" ? "Still in draft" : "Audit has been planned"} />
                  <CheckItem label="Independence Confirmed" ok={!!a.auditorIndependenceConfirmed} detail={a.auditorIndependenceConfirmed ? "Auditor independence confirmed" : "Independence not yet confirmed"} />
                  <CheckItem label="Findings Recorded" ok={findingsTotal > 0 || ["FINDINGS_REVIEW","REPORT_DRAFT","REPORT_SUBMITTED","REPORT_APPROVED","PENDING_CLOSURE","CLOSED","COMPLETED"].includes(a.status)} detail={findingsTotal > 0 ? `${findingsTotal} finding(s) recorded` : "No findings recorded yet"} />
                  <CheckItem label="Report Approved" ok={["REPORT_APPROVED","PENDING_CLOSURE","CLOSED","COMPLETED"].includes(a.status)} detail={a.status === "REPORT_APPROVED" ? "Report approved" : "Report not yet approved"} />
                  <CheckItem label="Ready for Closure" ok={["PENDING_CLOSURE","CLOSED","COMPLETED"].includes(a.status)} detail={a.status === "CLOSED" || a.status === "COMPLETED" ? "Audit closed" : a.status === "PENDING_CLOSURE" ? "Pending closure" : "Not yet ready for closure"} />
                </div>
              </div>
              <div className="space-y-4">
                {a.objective && <div><p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Objective</p><p className="mt-1 whitespace-pre-wrap text-body">{a.objective}</p></div>}
                {a.scope && <div><p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Scope</p><p className="mt-1 whitespace-pre-wrap text-body">{a.scope}</p></div>}
                {a.criteria && <div><p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">Criteria</p><p className="mt-1 whitespace-pre-wrap text-body">{a.criteria}</p></div>}
              </div>
            </div>
          )}
          {/* Tab 2: Audit Plan */}
          {tab === "plan" && (
            <div className="space-y-6">
              <Section title="Basic Details">
                <FieldGrid>
                  <Field label="Audit No." value={a.auditNo} />
                  <Field label="Type" value={AUDIT_TYPE_LABELS[a.auditType as keyof typeof AUDIT_TYPE_LABELS] ?? a.auditType} />
                  <Field label="Category" value={a.auditCategory ?? "—"} />
                  <Field label="Department" value={a.department ?? "—"} />
                  <Field label="Process Area" value={a.processArea ?? "—"} />
                  <Field label="Site" value={a.site ?? "—"} />
                  <Field label="Related Module" value={a.relatedModule ?? "—"} />
                  <Field label="Risk Level" value={a.riskLevel ? <Badge variant={riskLevelVariant(a.riskLevel)}>{RISK_LEVEL_LABELS[a.riskLevel as keyof typeof RISK_LEVEL_LABELS] ?? a.riskLevel}</Badge> : "—"} />
                </FieldGrid>
                <div className="mt-4 space-y-3">
                  {a.objective && <div><p className="text-label text-muted-foreground">Objective</p><p className="mt-0.5 whitespace-pre-wrap text-body">{a.objective}</p></div>}
                  {a.scope && <div><p className="text-label text-muted-foreground">Scope</p><p className="mt-0.5 whitespace-pre-wrap text-body">{a.scope}</p></div>}
                  {a.criteria && <div><p className="text-label text-muted-foreground">Criteria</p><p className="mt-0.5 whitespace-pre-wrap text-body">{a.criteria}</p></div>}
                </div>
              </Section>
              <Section title="Planning Details">
                <FieldGrid>
                  <Field label="Planned Start Date" value={formatDate(a.plannedStartDate)} />
                  <Field label="Planned End Date" value={formatDate(a.plannedEndDate)} />
                  <Field label="Actual Start Date" value={formatDate(a.actualStartDate) ?? "—"} />
                  <Field label="Actual End Date" value={formatDate(a.actualEndDate) ?? "—"} />
                  <Field label="Audit Method" value={a.method ?? "—"} />
                  <Field label="Frequency" value={a.frequency ?? "—"} />
                  <Field label="Previous Audit ID" value={a.previousAuditId != null ? String(a.previousAuditId) : "—"} />
                </FieldGrid>
                {a.reasonForAudit && <div className="mt-3"><p className="text-label text-muted-foreground">Reason for Audit</p><p className="mt-0.5 whitespace-pre-wrap text-body">{a.reasonForAudit}</p></div>}
              </Section>
              <Section title="Setup">
                <FieldGrid>
                  <Field label="Checklist Required?" value={<Badge variant={a.checklistRequired ? "info" : "neutral"}>{a.checklistRequired ? "Yes" : "No"}</Badge>} />
                  <Field label="Opening Meeting Required?" value={<Badge variant={a.openingMeetingRequired ? "info" : "neutral"}>{a.openingMeetingRequired ? "Yes" : "No"}</Badge>} />
                  <Field label="Closing Meeting Required?" value={<Badge variant={a.closingMeetingRequired ? "info" : "neutral"}>{a.closingMeetingRequired ? "Yes" : "No"}</Badge>} />
                  <Field label="Independence Confirmed?" value={<Badge variant={a.auditorIndependenceConfirmed ? "success" : "warning"}>{a.auditorIndependenceConfirmed ? "Confirmed" : "Not Confirmed"}</Badge>} />
                </FieldGrid>
              </Section>
            </div>
          )}
          {/* Tab 3: Checklist */}
          {tab === "checklist" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>{checklist.length > 0 && <p className="text-label text-muted-foreground">{checklistCompleted} of {checklist.length} items completed ({checklistPct}%)</p>}</div>
                <Button size="sm" variant="outline" onClick={() => setModal("addChecklist")}><Plus className="h-4 w-4" /> Add Item</Button>
              </div>
              {checklist.length > 0 && (
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div style={{ width: `${checklistPct}%` }} className="h-2 rounded-full bg-brand-primary transition-all" />
                </div>
              )}
              {checklistQuery.isLoading ? (
                <p className="text-body text-muted-foreground">Loading checklist...</p>
              ) : checklist.length === 0 ? (
                <Empty text="No checklist items added yet.">
                  <Button size="sm" onClick={() => setModal("addChecklist")}><Plus className="h-4 w-4" /> Add Checklist Item</Button>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left">
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Section</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Requirement</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Question</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Method</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Response</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Evidence</th>
                        <th className="py-2 text-label uppercase tracking-wide text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklist.map((item: AuditChecklistItem) => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{item.section ?? "—"}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{item.requirementReference ?? "—"}</td>
                          <td className="py-2 pr-4 max-w-[240px]">{item.question}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{item.checklistMethod?.replace(/_/g, " ") ?? "—"}</td>
                          <td className="py-2 pr-4">
                            <Select value={item.response ?? "NOT_CHECKED"} onChange={async (e) => {
                              try { await updateChecklistItem.mutateAsync({ itemId: item.id, response: e.target.value }); toast.success("Response updated"); } catch { /* interceptor */ }
                            }}>
                              <option value="NOT_CHECKED">Not Checked</option>
                              <option value="CONFORMING">Conforming</option>
                              <option value="NONCONFORMING">Nonconforming</option>
                              <option value="OBSERVATION">Observation</option>
                              <option value="OFI">OFI</option>
                              <option value="NOT_APPLICABLE">N/A</option>
                            </Select>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground max-w-[160px]">{item.expectedEvidence ?? "—"}</td>
                          <td className="py-2"><Badge variant={checklistResponseVariant(item.response ?? "NOT_CHECKED")}>{checklistResponseLabel(item.response ?? "NOT_CHECKED")}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Tab 4: Execution & Evidence */}
          {tab === "evidence" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-label text-muted-foreground">{evidence.length} evidence item(s) recorded</p>
                <Button size="sm" variant="outline" onClick={() => setModal("addEvidence")}><Plus className="h-4 w-4" /> Add Evidence</Button>
              </div>
              {evidenceQuery.isLoading ? (
                <p className="text-body text-muted-foreground">Loading evidence...</p>
              ) : evidence.length === 0 ? (
                <Empty text="No evidence recorded yet."><Button size="sm" onClick={() => setModal("addEvidence")}><Plus className="h-4 w-4" /> Add Evidence</Button></Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left">
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Type</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Description</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Reference</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Area</th>
                        <th className="py-2 text-label uppercase tracking-wide text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidence.map((ev) => (
                        <tr key={ev.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 whitespace-nowrap"><Badge variant="neutral">{ev.evidenceType?.replace(/_/g, " ") ?? "—"}</Badge></td>
                          <td className="py-2 pr-4 max-w-[280px]">{ev.description}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{ev.referenceNumber ?? "—"}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{ev.areaAudited ?? "—"}</td>
                          <td className="py-2 whitespace-nowrap text-muted-foreground">{formatDate(ev.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Tab 5: Findings */}
          {tab === "findings" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <StatPill label="Total" value={findings.length} />
                  <StatPill label="Open" value={findings.filter((f: AuditFinding) => f.findingStatus !== "CLOSED").length} />
                  <StatPill label="Critical/Major" value={majorCritical} />
                  <StatPill label="Closed" value={findings.filter((f: AuditFinding) => f.findingStatus === "CLOSED").length} />
                </div>
                <Button size="sm" variant="outline" onClick={() => setModal("addFinding")}><Plus className="h-4 w-4" /> Add Finding</Button>
              </div>
              {findingsQuery.isLoading ? (
                <p className="text-body text-muted-foreground">Loading findings...</p>
              ) : findings.length === 0 ? (
                <Empty text="No findings recorded."><Button size="sm" onClick={() => setModal("addFinding")}><Plus className="h-4 w-4" /> Add Finding</Button></Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left">
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Code</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Title</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Type</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Severity</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Area</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Due Date</th>
                        <th className="py-2 text-label uppercase tracking-wide text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map((f: AuditFinding) => (
                        <tr key={f.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 whitespace-nowrap font-mono text-label">{f.findingCode ?? `F-${f.id}`}</td>
                          <td className="py-2 pr-4 max-w-[200px] font-medium">
                            {f.title ?? "—"}
                            {f.description && <p className="text-label text-muted-foreground truncate max-w-[180px]">{f.description}</p>}
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <Badge variant={findingTypeVariant(f.findingType ?? "")}>{f.findingType ? (FINDING_TYPE_LABELS[f.findingType as keyof typeof FINDING_TYPE_LABELS] ?? f.findingType) : "—"}</Badge>
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <Badge variant={findingSeverityVariant(f.severity as FindingSeverity)}>{FINDING_SEVERITY_LABELS[f.severity as keyof typeof FINDING_SEVERITY_LABELS] ?? f.severity}</Badge>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{f.area ?? "—"}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <Badge variant={findingStatusVariant(f.findingStatus)}>{FINDING_STATUS_LABELS[f.findingStatus as keyof typeof FINDING_STATUS_LABELS] ?? f.findingStatus}</Badge>
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(f.dueDate) ?? "—"}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              {f.findingStatus !== "ACKNOWLEDGED" && f.findingStatus !== "CLOSED" && (
                                <Button size="sm" variant="outline" onClick={async () => {
                                  try { await acknowledgeFinding.mutateAsync({ findingId: f.id }); toast.success("Finding acknowledged"); } catch { /* interceptor */ }
                                }}>Acknowledge</Button>
                              )}
                              {f.findingStatus !== "CLOSED" && (
                                <Button size="sm" variant="outline" onClick={async () => {
                                  const comments = window.prompt("Closure comments (required):");
                                  if (!comments) return;
                                  try { await closeFinding.mutateAsync({ findingId: f.id, closureComments: comments }); toast.success("Finding closed"); } catch { /* interceptor */ }
                                }}>Close</Button>
                              )}
                              {f.capaRequired && f.findingStatus !== "CLOSED" && (
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const desc = window.prompt("CAPA description:");
                                  if (!desc) return;
                                  try { await createCapaFromFinding.mutateAsync({ findingId: f.id, description: desc, effectivenessCheckRequired: true }); toast.success("CAPA created"); } catch { /* interceptor */ }
                                }}>Create CAPA</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Tab 6: Action Plans */}
          {tab === "action-plans" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <StatPill label="Total" value={actionPlans.length} />
                  <StatPill label="Not Started" value={actionPlans.filter((ap: AuditActionPlan) => ap.status === "NOT_STARTED").length} />
                  <StatPill label="In Progress" value={actionPlans.filter((ap: AuditActionPlan) => ap.status === "IN_PROGRESS").length} />
                  <StatPill label="Completed" value={actionPlans.filter((ap: AuditActionPlan) => ap.status === "COMPLETED" || ap.status === "VERIFIED").length} />
                  <StatPill label="Overdue" value={actionPlans.filter((ap: AuditActionPlan) => ap.status === "OVERDUE").length} />
                </div>
                <Button size="sm" variant="outline" onClick={() => setModal("addAction")}><Plus className="h-4 w-4" /> Add Action Plan</Button>
              </div>
              {actionPlansQuery.isLoading ? (
                <p className="text-body text-muted-foreground">Loading action plans...</p>
              ) : actionPlans.length === 0 ? (
                <Empty text="No action plans recorded."><Button size="sm" onClick={() => setModal("addAction")}><Plus className="h-4 w-4" /> Add Action Plan</Button></Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left">
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Type</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Description</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Owner</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Due Date</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Effectiveness</th>
                        <th className="py-2 text-label uppercase tracking-wide text-muted-foreground">Update Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionPlans.map((ap: AuditActionPlan) => (
                        <tr key={ap.id} className="border-b border-border last:border-0">
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{ap.actionType?.replace(/_/g, " ") ?? "—"}</td>
                          <td className="py-2 pr-4 max-w-[240px]">{ap.description}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{ap.actionOwnerId ? `User #${ap.actionOwnerId}` : "—"}</td>
                          <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{formatDate(ap.dueDate) ?? "—"}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            <Badge variant={actionPlanStatusVariant(ap.status)}>{ACTION_PLAN_STATUS_LABELS[ap.status as keyof typeof ACTION_PLAN_STATUS_LABELS] ?? ap.status}</Badge>
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {ap.effectivenessCheckRequired ? <Badge variant={ap.effectivenessResult === "EFFECTIVE" ? "success" : "warning"}>{ap.effectivenessResult ?? "Required"}</Badge> : "—"}
                          </td>
                          <td className="py-2">
                            <Select value={ap.status} onChange={async (e) => {
                              try { await updateActionPlan.mutateAsync({ actionId: ap.id, status: e.target.value }); toast.success("Status updated"); } catch { /* interceptor */ }
                            }}>
                              <option value="NOT_STARTED">Not Started</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="VERIFIED">Verified</option>
                              <option value="OVERDUE">Overdue</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="CLOSED">Closed</option>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Tab 7: Meetings */}
          {tab === "meetings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-label text-muted-foreground">{meetings.length} meeting(s) logged</p>
                <Button size="sm" variant="outline" onClick={() => setModal("addMeeting")}><Plus className="h-4 w-4" /> Log Meeting</Button>
              </div>
              {meetingsQuery.isLoading ? (
                <p className="text-body text-muted-foreground">Loading meetings...</p>
              ) : meetings.length === 0 ? (
                <Empty text="No meetings logged yet."><Button size="sm" onClick={() => setModal("addMeeting")}><Plus className="h-4 w-4" /> Log Meeting</Button></Empty>
              ) : (
                <div className="space-y-3">
                  {meetings.map((m: AuditMeeting) => (
                    <div className="rounded-lg border border-border p-4" key={m.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">{m.meetingType?.replace(/_/g, " ")}</Badge>
                        <span className="text-muted-foreground text-label">{formatDate(m.meetingDateTime)}</span>
                        {m.minutesApproved && <Badge variant="success">Minutes Approved</Badge>}
                      </div>
                      {m.attendees && <p className="mt-2 text-label text-muted-foreground">Attendees: {m.attendees}</p>}
                      {m.agenda && <p className="mt-1 text-body">{m.agenda}</p>}
                      {m.discussionSummary && <p className="mt-1 text-body text-muted-foreground">{m.discussionSummary}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Tab 8: Linked Records */}
          {tab === "linked" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-label text-muted-foreground">{linkedRecords.length} linked record(s)</p>
                <Button size="sm" variant="outline" onClick={() => setModal("linkRecord")}><Plus className="h-4 w-4" /> Link Record</Button>
              </div>
              {linkedQuery.isLoading ? (
                <p className="text-body text-muted-foreground">Loading linked records...</p>
              ) : linkedRecords.length === 0 ? (
                <Empty text="No records linked."><Button size="sm" onClick={() => setModal("linkRecord")}><Plus className="h-4 w-4" /> Link Record</Button></Empty>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedLinked).map(([type, records]) => (
                    <div key={type}>
                      <h3 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted-foreground">{type.replace(/_/g, " ")}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-body">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-left">
                              <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Reference</th>
                              <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Title</th>
                              <th className="py-2 pr-4 text-label uppercase tracking-wide text-muted-foreground">Status</th>
                              <th className="py-2 text-label uppercase tracking-wide text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(records as AuditLinkedRecord[]).map((r) => (
                              <tr key={r.id} className="border-b border-border last:border-0">
                                <td className="py-2 pr-4 whitespace-nowrap">{r.recordReference ?? `#${r.recordId}`}</td>
                                <td className="py-2 pr-4 text-muted-foreground">{r.recordTitle ?? "—"}</td>
                                <td className="py-2 pr-4 whitespace-nowrap">{r.recordStatus ? <Badge variant="neutral">{r.recordStatus}</Badge> : "—"}</td>
                                <td className="py-2">
                                  <button onClick={async () => {
                                    try { await removeLinkedRecord.mutateAsync({ linkId: r.id }); toast.success("Record unlinked"); } catch { /* interceptor */ }
                                  }} className="text-error hover:underline text-label">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Tab 9: Audit Trail */}
          {tab === "trail" && (
            <Card>
              <CardContent className="pt-4">
                <AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} />
              </CardContent>
            </Card>
          )}

        </CardContent>
      </Card>

      {/* Modals */}

      <SignatureModal
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        title="Finalize Audit"
        recordNumber={a.auditNo}
        recordTitle={a.auditTitle}
        recordNoun="audit"
        statusNode={<Badge variant={auditStatusVariant(a.status)}>{AUDIT_STATUS_LABELS[a.status] ?? a.status}</Badge>}
        isPending={action.isPending}
        successMessage="Audit finalized"
        onSign={async (creds) => {
          await action.mutateAsync({ path: "finalize", body: { expectedVersion: a.version, reason: creds.reason, password: creds.password, totpCode: creds.totpCode } });
        }}
      />

      <ReasonModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close Audit"
        defaultReason="Audit completed and closed"
        submitLabel="Close Audit"
        isPending={closeAudit.isPending}
        onSubmit={async (reason) => {
          await closeAudit.mutateAsync({ closureComments: reason, expectedVersion: a.version });
        }}
      />

      <ReasonModal
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen Audit"
        defaultReason="Audit reopened for further review"
        submitLabel="Reopen"
        isPending={reopenAudit.isPending}
        onSubmit={async (reason) => {
          await reopenAudit.mutateAsync({ reason, expectedVersion: a.version });
        }}
      />

      <ReasonModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Audit"
        defaultReason="Audit cancelled"
        submitLabel="Cancel Audit"
        isPending={action.isPending}
        onSubmit={async (reason) => {
          await action.mutateAsync({ path: "cancel", body: { expectedVersion: a.version, reason } });
        }}
      />

      <ActionFormModal
        open={modal === "addChecklist"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Add Checklist Item"
        isPending={addChecklistItem.isPending}
        successMessage="Checklist item added"
        fields={checklistFields}
        onSubmit={async (values) => {
          await addChecklistItem.mutateAsync({
            section: values.section || undefined,
            requirementReference: values.requirementReference || undefined,
            question: values.question,
            expectedEvidence: values.expectedEvidence || undefined,
            checklistMethod: values.checklistMethod || undefined,
            sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
          });
          setModal(null);
        }}
      />

      <ActionFormModal
        open={modal === "addEvidence"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Add Evidence"
        isPending={addEvidence.isPending}
        successMessage="Evidence added"
        fields={evidenceFields}
        onSubmit={async (values) => {
          await addEvidence.mutateAsync({
            evidenceType: values.evidenceType,
            description: values.description,
            referenceNumber: values.referenceNumber || undefined,
            areaAudited: values.areaAudited || undefined,
            personInterviewed: values.personInterviewed || undefined,
            auditorNotes: values.auditorNotes || undefined,
          });
          setModal(null);
        }}
      />

      <ActionFormModal
        open={modal === "addFinding"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Add Finding"
        isPending={addFinding.isPending}
        successMessage="Finding added"
        fields={findingFields}
        onSubmit={async (values) => {
          await addFinding.mutateAsync({
            title: values.title || undefined,
            description: values.description,
            findingType: values.findingType || undefined,
            area: values.area || undefined,
            severity: values.severity,
            riskLevel: values.riskLevel || undefined,
            requirementReference: values.requirementReference || undefined,
            evidence: values.evidence || undefined,
            capaRequired: values.capaRequired === "true",
          });
          setModal(null);
        }}
      />

      <ActionFormModal
        open={modal === "addAction"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Add Action Plan"
        isPending={addActionPlan.isPending}
        successMessage="Action plan added"
        fields={actionPlanFields}
        onSubmit={async (values) => {
          await addActionPlan.mutateAsync({
            actionType: values.actionType,
            description: values.description,
            dueDate: values.dueDate || undefined,
            priority: values.priority || undefined,
            effectivenessCheckRequired: values.effectivenessCheckRequired === "true",
            comments: values.comments || undefined,
          });
          setModal(null);
        }}
      />

      <ActionFormModal
        open={modal === "addMeeting"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Log Meeting"
        isPending={addMeeting.isPending}
        successMessage="Meeting logged"
        fields={meetingFields}
        onSubmit={async (values) => {
          await addMeeting.mutateAsync({
            meetingType: values.meetingType,
            meetingDateTime: values.meetingDateTime || undefined,
            attendees: values.attendees || undefined,
            agenda: values.agenda || undefined,
            discussionSummary: values.discussionSummary || undefined,
          });
          setModal(null);
        }}
      />

      <ActionFormModal
        open={modal === "linkRecord"}
        onOpenChange={(open) => !open && setModal(null)}
        title="Link Record"
        isPending={addLinkedRecord.isPending}
        successMessage="Record linked"
        fields={linkedRecordFields}
        onSubmit={async (values) => {
          await addLinkedRecord.mutateAsync({
            recordType: values.recordType,
            recordId: Number(values.recordId),
            recordReference: values.recordReference || undefined,
            recordTitle: values.recordTitle || undefined,
            notes: values.notes || undefined,
          });
          setModal(null);
        }}
      />
    </div>
  );
}