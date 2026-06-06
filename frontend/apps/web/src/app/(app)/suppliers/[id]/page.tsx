"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Download, FileUp, Plus } from "lucide-react";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { SignatureModal } from "@/components/common/SignatureModal";
import { SupplierPerformanceChart } from "@/components/suppliers/SupplierPerformanceChart";
import { SupplierStatusBadge, SupplierTypeBadge, SeverityBadge, certificateExpiryClass, certificationStatus } from "@/components/suppliers/SupplierBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useSupplier,
  useSupplierAction,
  useSupplierAudits,
  useSupplierCertifications,
  useSupplierFindings,
  useSupplierPerformance,
  useSupplierTrail,
} from "@/hooks/useSuppliers";

type TabKey = "qualifications" | "certifications" | "performance" | "audits" | "findings" | "contact" | "trail";
type ModalKey = null | "certificate" | "performance" | "audit" | "finding";

const TABS = [
  { key: "qualifications", label: "Qualifications" },
  { key: "certifications", label: "Certifications" },
  { key: "performance", label: "Performance" },
  { key: "audits", label: "Audit History" },
  { key: "findings", label: "Findings & CAPAs" },
  { key: "contact", label: "Contact & Location" },
  { key: "trail", label: "Audit Trail" },
];

export default function SupplierDetailPage() {
  const id = Number(useParams().id);
  const supplier = useSupplier(id);
  const certs = useSupplierCertifications(id);
  const performance = useSupplierPerformance(id);
  const audits = useSupplierAudits(id);
  const findings = useSupplierFindings(id);
  const trail = useSupplierTrail(id);
  const action = useSupplierAction(id);
  const [tab, setTab] = useState<TabKey>("qualifications");
  const [modal, setModal] = useState<ModalKey>(null);
  const [qualifyOpen, setQualifyOpen] = useState(false);
  const [assessmentMethod, setAssessmentMethod] = useState("Audit");
  const [assessmentFindings, setAssessmentFindings] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("Approved");
  const [conditionalReason, setConditionalReason] = useState("");

  const latestPerf = useMemo(() => performance.data?.[0], [performance.data]);

  if (supplier.isLoading) return <LoadingScreen label="Loading supplier..." />;
  if (supplier.isError || !supplier.data) return <ErrorAlert title="Error" message="Failed to load this supplier." />;
  const s = supplier.data;

  async function submitQualify(creds: { password: string; totpCode?: string; meaningStatement: string; reason?: string }) {
    await action.mutateAsync({
      path: approvalStatus === "Conditional" ? "conditional" : "qualify",
      body: approvalStatus === "Conditional"
        ? { expectedVersion: s.version, reason: conditionalReason || creds.reason || "Conditional qualification" }
        : { expectedVersion: s.version, assessmentMethod, notes: assessmentFindings, reason: creds.reason || "Supplier qualification", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <div className="text-label text-muted-foreground"><Link href="/suppliers" className="hover:underline">Suppliers</Link> / {s.supplierCode}</div>
          <h1 className="text-h1 text-brand-primary">{s.supplierName}</h1>
          <div className="mt-1 flex flex-wrap gap-2"><SupplierStatusBadge status={s.status} /><SupplierTypeBadge type={s.supplierType} /></div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={() => setQualifyOpen(true)}>Qualify</Button>
          <Button variant="outline" onClick={() => setModal("audit")}><CalendarPlus className="h-4 w-4" /> Schedule Audit</Button>
          <Button variant="outline" onClick={() => setModal("certificate")}><FileUp className="h-4 w-4" /> Upload Certificate</Button>
          <Button variant="outline" onClick={() => setModal("performance")}>Record Performance</Button>
          <Button variant="outline" onClick={() => setModal("finding")}><Plus className="h-4 w-4" /> Create Finding</Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-5">
          <Field label="Code" value={s.supplierCode} />
          <Field label="Type" value={<SupplierTypeBadge type={s.supplierType} />} />
          <Field label="Status" value={<SupplierStatusBadge status={s.status} />} />
          <Field label="Contact" value={s.contactPerson ?? "Unassigned"} />
          <Field label="Location" value={s.location} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} /></CardHeader>
        <CardContent>
          {tab === "qualifications" && (
            <Table headers={["Assessment", "Date", "Assessor", "Approval", "Findings"]} rows={(audits.data ?? []).map((a) => [a.assessmentMethod, formatDate(a.assessmentDate), a.assessor ?? "-", <Badge key={a.id} variant={a.approvalStatus === "QUALIFIED" ? "success" : "info"}>{a.approvalStatus ?? "Recorded"}</Badge>, a.notes ?? "-"])} empty="No qualification history." />
          )}
          {tab === "certifications" && (
            <Table headers={["Certificate Type", "Issue Date", "Expiry Date", "File", "Actions"]} rows={(certs.data ?? []).map((c) => [
              c.certType,
              formatDate(c.issueDate),
              <span key={c.id} className={cn("rounded-sm px-2 py-0.5 text-label font-medium", certificateExpiryClass(c.expiryDate))}>{formatDate(c.expiryDate)} - {certificationStatus(c.expiryDate)}</span>,
              c.filePath ?? "-",
              <div key={c.id} className="flex gap-2"><Button size="sm" variant="outline" disabled={!c.filePath} onClick={() => c.filePath && window.open(c.filePath, "_blank")}><Download className="h-4 w-4" /> Download</Button><Button size="sm" variant="outline" disabled>Delete</Button></div>,
            ])} empty="No certificates uploaded." />
          )}
          {tab === "performance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Metric label="Delivery" value={`${latestPerf?.onTimeDeliveryPct ?? 0}%`} />
                <Metric label="Quality" value={`${latestPerf?.qualityAcceptancePct ?? 0}%`} />
                <Metric label="Responsiveness" value={`${latestPerf?.responsivenessRating ?? 0}/5`} />
              </div>
              <SupplierPerformanceChart data={performance.data} />
            </div>
          )}
          {tab === "audits" && (
            <Table headers={["Audit Number", "Date", "Auditor", "Findings", "Status"]} rows={(audits.data ?? []).map((a) => [`AUD-${String(a.id).padStart(4, "0")}`, formatDate(a.assessmentDate), a.assessor ?? "-", findings.data?.length ?? 0, a.approvalStatus ?? "Recorded"])} empty="No supplier audits recorded." />
          )}
          {tab === "findings" && (
            <Table headers={["Finding Date", "Description", "Severity", "Corrective Action Linked"]} rows={(findings.data ?? []).map((f) => [formatDate(f.findingDate), f.findingDescription, <SeverityBadge key={f.id} severity={f.severity} />, f.correctiveActionRequired ? "CAPA required" : "No"])} empty="No findings recorded." />
          )}
          {tab === "contact" && <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Field label="Contact" value={s.contactPerson ?? "-"} /><Field label="Email" value={s.email ?? "-"} /><Field label="Phone" value={s.phone ?? "-"} /><Field label="Location" value={s.location} /></div>}
          {tab === "trail" && <AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} />}
        </CardContent>
      </Card>

      <SignatureModal open={qualifyOpen} onOpenChange={setQualifyOpen} title="Qualify Supplier" recordNumber={s.supplierCode} recordTitle={s.supplierName} recordNoun="supplier" statusNode={<SupplierStatusBadge status={s.status} />} isPending={action.isPending} successMessage="Supplier qualification submitted" onSign={submitQualify}>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="assessmentMethod">Assessment method</Label><Select id="assessmentMethod" value={assessmentMethod} onChange={(e) => setAssessmentMethod(e.target.value)}><option>Document Review</option><option>Audit</option><option>Questionnaire</option></Select></div>
          <div className="space-y-1.5"><Label htmlFor="assessmentFindings">Assessment findings</Label><Textarea id="assessmentFindings" rows={3} value={assessmentFindings} onChange={(e) => setAssessmentFindings(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="approvalStatus">Approval status</Label><Select id="approvalStatus" value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}><option>Approved</option><option>Conditional</option><option>Rejected</option></Select></div>
          {approvalStatus === "Conditional" && <div className="space-y-1.5"><Label htmlFor="conditionalReason">Conditional reason</Label><Textarea id="conditionalReason" rows={2} value={conditionalReason} onChange={(e) => setConditionalReason(e.target.value)} /></div>}
        </div>
      </SignatureModal>

      <ActionFormModal open={modal === "certificate"} onOpenChange={(o) => !o && setModal(null)} title="Upload Certificate" submitLabel="Upload" isPending={action.isPending} successMessage="Certificate uploaded"
        fields={[{ name: "certType", label: "Certificate type", type: "select", options: ["ISO 9001", "ISO 13485", "GMP", "GDP", "Other"].map((v) => ({ value: v, label: v })) }, { name: "issueDate", label: "Issue date", type: "date" }, { name: "expiryDate", label: "Expiry date", type: "date" }, { name: "filePath", label: "File path or URL", type: "text" }]}
        onSubmit={async (v) => action.mutateAsync({ path: "upload-certificate", body: { certType: v.certType, issueDate: toInstant(v.issueDate), expiryDate: toInstant(v.expiryDate), filePath: v.filePath } })} />
      <ActionFormModal open={modal === "performance"} onOpenChange={(o) => !o && setModal(null)} title="Record Performance" submitLabel="Record" isPending={action.isPending} successMessage="Performance recorded"
        fields={[{ name: "period", label: "Period (month/year)", type: "text", placeholder: "2026-06", required: true }, { name: "onTimeDeliveryPct", label: "On-time delivery %", type: "number", required: true }, { name: "qualityAcceptancePct", label: "Quality acceptance %", type: "number", required: true }, { name: "responsivenessRating", label: "Responsiveness rating", type: "select", options: [1, 2, 3, 4, 5].map((v) => ({ value: String(v), label: `${v} star${v > 1 ? "s" : ""}` })) }]}
        onSubmit={async (v) => { const p = periodRange(v.period); await action.mutateAsync({ path: "record-performance", body: { assessmentPeriodStart: p.start, assessmentPeriodEnd: p.end, onTimeDeliveryPct: Number(v.onTimeDeliveryPct), qualityAcceptancePct: Number(v.qualityAcceptancePct), responsivenessRating: Number(v.responsivenessRating) } }); }} />
      <ActionFormModal open={modal === "audit"} onOpenChange={(o) => !o && setModal(null)} title="Schedule New Audit" isPending={action.isPending} successMessage="Audit scheduled"
        fields={[{ name: "auditDate", label: "Audit date", type: "date", required: true }, { name: "auditor", label: "Auditor", type: "text" }]}
        onSubmit={async (v) => action.mutateAsync({ path: "schedule-audit", body: { auditDate: toInstant(v.auditDate), auditor: v.auditor } })} />
      <ActionFormModal open={modal === "finding"} onOpenChange={(o) => !o && setModal(null)} title="Create Finding" isPending={action.isPending} successMessage="Finding created"
        fields={[{ name: "findingDescription", label: "Finding description", type: "textarea", required: true }, { name: "severity", label: "Severity", type: "select", options: ["CRITICAL", "MAJOR", "MINOR"].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() })) }, { name: "createCapa", label: "Create CAPA for this finding", type: "select", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes" }] }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "issue-finding", body: { findingDescription: v.findingDescription, severity: v.severity, correctiveActionRequired: v.createCapa === "true" } }); toast.message(v.createCapa === "true" ? "Finding created; CAPA linkage is flagged for QA follow-up." : "Finding recorded."); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-label text-muted-foreground">{label}</p><div className="mt-0.5 text-body font-medium">{value}</div></div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border p-3"><p className="text-label text-muted-foreground">{label}</p><p className="text-h2 text-brand-primary">{value}</p></div>;
}
function Table({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-body text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><table className="w-full text-body"><thead><tr className="border-b border-border text-left">{headers.map((h) => <th key={h} className="px-3 py-2 text-label uppercase text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-b border-border last:border-0">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}</tbody></table></div>;
}
function toInstant(date: string) {
  return date ? new Date(`${date}T00:00:00.000Z`).toISOString() : null;
}
function periodRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year || new Date().getUTCFullYear(), (month || 1) - 1, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59));
  return { start: start.toISOString(), end: end.toISOString() };
}
