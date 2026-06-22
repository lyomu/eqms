"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Download, FileUp, Plus } from "lucide-react";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { SignatureModal } from "@/components/common/SignatureModal";
import { SupplierPerformanceChart } from "@/components/suppliers/SupplierPerformanceChart";
import {
  SupplierStatusBadge,
  SupplierTypeBadge,
  SeverityBadge,
  certificateExpiryClass,
  certificationStatus,
} from "@/components/suppliers/SupplierBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { formatDate, formatDateTime } from "@/lib/format";
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
import { SUPPLIER_TYPE_LABELS } from "@/types/supplier";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey =
  | "overview"
  | "qualifications"
  | "certifications"
  | "performance"
  | "audits"
  | "findings"
  | "contact"
  | "trail";

type ModalKey = null | "certificate" | "performance" | "audit" | "finding";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "qualifications", label: "Qualifications" },
  { key: "certifications", label: "Certifications" },
  { key: "performance", label: "Performance" },
  { key: "audits", label: "Audits" },
  { key: "findings", label: "Findings & Issues" },
  { key: "contact", label: "Contact & Details" },
  { key: "trail", label: "Audit Trail" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierDetailPage() {
  const id = Number(useParams().id);
  const supplier = useSupplier(id);
  const certs = useSupplierCertifications(id);
  const performance = useSupplierPerformance(id);
  const audits = useSupplierAudits(id);
  const findings = useSupplierFindings(id);
  const trail = useSupplierTrail(id);
  const action = useSupplierAction(id);

  const [tab, setTab] = useState<TabKey>("overview");
  const [modal, setModal] = useState<ModalKey>(null);
  const [qualifyOpen, setQualifyOpen] = useState(false);
  const [assessmentMethod, setAssessmentMethod] = useState("Audit");
  const [assessmentFindings, setAssessmentFindings] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("Approved");
  const [conditionalReason, setConditionalReason] = useState("");

  const latestPerf = useMemo(() => performance.data?.[0], [performance.data]);

  // ── Derived counts for overview ──────────────────────────────────────────────
  const today = Date.now();

  const totalCerts = certs.data?.length ?? 0;
  const activeCerts = useMemo(
    () =>
      (certs.data ?? []).filter(
        (c) => c.expiryDate && new Date(c.expiryDate).getTime() > today
      ).length,
    [certs.data, today]
  );

  const hasExpiredCert = useMemo(
    () =>
      (certs.data ?? []).some(
        (c) => c.expiryDate && new Date(c.expiryDate).getTime() < today
      ),
    [certs.data, today]
  );

  const openFindings = useMemo(
    () => (findings.data ?? []).filter((f) => f.correctiveActionRequired).length,
    [findings.data]
  );

  const hasCriticalOpenFindings = useMemo(
    () =>
      (findings.data ?? []).some(
        (f) => f.severity === "CRITICAL" && f.correctiveActionRequired
      ),
    [findings.data]
  );

  const avgPerfScore = useMemo(() => {
    const perf = latestPerf;
    if (!perf) return null;
    const d = perf.onTimeDeliveryPct ?? null;
    const q = perf.qualityAcceptancePct ?? null;
    if (d === null && q === null) return null;
    const vals = [d, q].filter((v): v is number => v !== null);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [latestPerf]);

  if (supplier.isLoading) return <LoadingScreen label="Loading supplier..." />;
  if (supplier.isError || !supplier.data)
    return <ErrorAlert title="Error" message="Failed to load this supplier." />;

  const s = supplier.data;

  async function submitQualify(creds: {
    password: string;
    totpCode?: string;
    meaningStatement: string;
    reason?: string;
  }) {
    await action.mutateAsync({
      path: approvalStatus === "Conditional" ? "conditional" : "qualify",
      body:
        approvalStatus === "Conditional"
          ? {
              expectedVersion: s.version,
              reason:
                conditionalReason || creds.reason || "Conditional qualification",
            }
          : {
              expectedVersion: s.version,
              assessmentMethod,
              notes: assessmentFindings,
              reason: creds.reason || "Supplier qualification",
              password: creds.password,
              totpCode: creds.totpCode,
              meaningStatement: creds.meaningStatement,
            },
    });
  }

  // ── Qualification checklist ──────────────────────────────────────────────────
  const qualChecklist = [
    {
      label: "Supplier record created",
      checked: true,
      statusText: "Complete",
    },
    {
      label: "Contact details filled",
      checked: !!(s.contactPerson && s.email),
      statusText:
        s.contactPerson && s.email ? "Contact and email on file" : "Missing contact or email",
    },
    {
      label: "At least one certificate uploaded",
      checked: totalCerts > 0,
      statusText: totalCerts > 0 ? `${totalCerts} certificate(s) uploaded` : "No certificates",
    },
    {
      label: "Qualification assessment recorded",
      checked: (audits.data?.length ?? 0) > 0,
      statusText:
        (audits.data?.length ?? 0) > 0
          ? `${audits.data!.length} assessment(s) on record`
          : "No assessments recorded",
    },
    {
      label: "Performance data recorded",
      checked: (performance.data?.length ?? 0) > 0,
      statusText:
        (performance.data?.length ?? 0) > 0 ? "Performance data present" : "No performance data",
    },
    {
      label: "No critical open findings",
      checked: !hasCriticalOpenFindings,
      statusText: hasCriticalOpenFindings
        ? "Critical findings require attention"
        : "No critical open findings",
    },
  ];

  // ── Certification stat pills ─────────────────────────────────────────────────
  const expiringIn30 = (certs.data ?? []).filter((c) => {
    if (!c.expiryDate) return false;
    const diff = Math.ceil(
      (new Date(c.expiryDate).getTime() - today) / 86_400_000
    );
    return diff >= 0 && diff <= 30;
  }).length;
  const expiredCerts = (certs.data ?? []).filter(
    (c) => c.expiryDate && new Date(c.expiryDate).getTime() < today
  ).length;

  // ── Finding severity counts ──────────────────────────────────────────────────
  const criticalCount = (findings.data ?? []).filter((f) => f.severity === "CRITICAL").length;
  const majorCount = (findings.data ?? []).filter((f) => f.severity === "MAJOR").length;
  const minorCount = (findings.data ?? []).filter((f) => f.severity === "MINOR").length;

  return (
    <div className="space-y-4">
      {/* ── Header + toolbar ── */}
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <div className="text-label text-muted-foreground">
            <Link href="/suppliers" className="hover:underline">
              Suppliers
            </Link>{" "}
            / {s.supplierCode}
          </div>
          <h1 className="text-h1 text-brand-primary">{s.supplierName}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <SupplierStatusBadge status={s.status} />
            <SupplierTypeBadge type={s.supplierType} />
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button onClick={() => setQualifyOpen(true)}>Qualify</Button>
          <Button variant="outline" onClick={() => setModal("audit")}>
            <CalendarPlus className="h-4 w-4" />
            Schedule Audit
          </Button>
          <Button variant="outline" onClick={() => setModal("certificate")}>
            <FileUp className="h-4 w-4" />
            Upload Certificate
          </Button>
          <Button variant="outline" onClick={() => setModal("performance")}>
            Record Performance
          </Button>
          <Button variant="outline" onClick={() => setModal("finding")}>
            <Plus className="h-4 w-4" />
            Create Finding
          </Button>
        </div>
      </div>

      {/* ── Warning banners ── */}
      {s.status === "UNAPPROVED" && (
        <div className="rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          This supplier is not yet approved. Complete the qualification workflow before use.
        </div>
      )}
      {hasExpiredCert && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body text-[#7A5A00]">
          One or more certificates have expired. Review required.
        </div>
      )}
      {hasCriticalOpenFindings && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body text-[#7A5A00]">
          Critical findings exist that may require CAPA.
        </div>
      )}

      {/* ── Enhanced header card ── */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Code" value={<span className="font-mono font-semibold">{s.supplierCode}</span>} />
          <Field label="Type" value={<SupplierTypeBadge type={s.supplierType} />} />
          <Field label="Status" value={<SupplierStatusBadge status={s.status} />} />
          <Field label="Contact" value={s.contactPerson ?? "—"} />
          <Field label="Location" value={s.location} />
          <Field
            label="Qualification Date"
            value={s.qualificationDate ? formatDate(s.qualificationDate) : "Not qualified"}
          />
          <Field
            label="Owner"
            value={s.ownerId ? `User #${s.ownerId}` : "Unassigned"}
          />
          <Field label="Created At" value={formatDate(s.createdAt)} />
        </CardContent>
      </Card>

      {/* ── Tab card ── */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} />
        </CardHeader>
        <CardContent className="pt-4">

          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Total Certs" value={String(totalCerts)} />
                <Metric label="Active Certs" value={String(activeCerts)} />
                <Metric label="Open Findings" value={String(openFindings)} />
                <Metric
                  label="Performance Score"
                  value={avgPerfScore !== null ? `${avgPerfScore}%` : "N/A"}
                />
              </div>

              {/* Key information grid */}
              <div>
                <h3 className="mb-3 text-body font-semibold text-foreground">Key Information</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Supplier Name" value={s.supplierName} />
                  <Field label="Supplier Code" value={<span className="font-mono">{s.supplierCode}</span>} />
                  <Field label="Type" value={SUPPLIER_TYPE_LABELS[s.supplierType]} />
                  <Field label="Status" value={<SupplierStatusBadge status={s.status} />} />
                  <Field label="Contact Person" value={s.contactPerson ?? "—"} />
                  <Field
                    label="Email"
                    value={
                      s.email ? (
                        <a href={`mailto:${s.email}`} className="text-brand-primary hover:underline">
                          {s.email}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field label="Phone" value={s.phone ?? "—"} />
                  <Field label="Location" value={s.location} />
                  <Field
                    label="Qualification Date"
                    value={s.qualificationDate ? formatDate(s.qualificationDate) : "Not qualified"}
                  />
                  <Field label="Created At" value={formatDateTime(s.createdAt)} />
                  <Field
                    label="Owner"
                    value={s.ownerId ? `User #${s.ownerId}` : "Unassigned"}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Qualifications tab ── */}
          {tab === "qualifications" && (
            <div className="space-y-4">
              {/* QA Qualification Checklist */}
              <Card>
                <CardHeader>
                  <CardTitle>QA Qualification Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {qualChecklist.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          item.checked
                            ? "bg-success/15 text-success"
                            : "bg-error/15 text-error"
                        )}
                      >
                        {item.checked ? "✓" : "✗"}
                      </span>
                      <span className="flex-1 text-body">{item.label}</span>
                      <span
                        className={cn(
                          "text-label",
                          item.checked ? "text-success" : "text-error"
                        )}
                      >
                        {item.statusText}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Qualification history table */}
              <Table
                headers={["Assessment", "Date", "Assessor", "Approval", "Findings"]}
                rows={(audits.data ?? []).map((a) => [
                  a.assessmentMethod,
                  formatDate(a.assessmentDate),
                  a.assessor ?? "—",
                  <Badge key={a.id} variant={a.approvalStatus === "QUALIFIED" ? "success" : "info"}>
                    {a.approvalStatus ?? "Recorded"}
                  </Badge>,
                  a.notes ?? "—",
                ])}
                empty="No qualification history."
              />
            </div>
          )}

          {/* ── Certifications tab ── */}
          {tab === "certifications" && (
            <div className="space-y-4">
              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                <StatPill label="Total" value={totalCerts} color="neutral" />
                <StatPill label="Active" value={activeCerts} color="success" />
                <StatPill label="Expiring in 30 days" value={expiringIn30} color="warning" />
                <StatPill label="Expired" value={expiredCerts} color="error" />
              </div>

              <Table
                headers={["Certificate Type", "Issue Date", "Expiry Date", "File", "Actions"]}
                rows={(certs.data ?? []).map((c) => [
                  c.certType,
                  formatDate(c.issueDate),
                  <span
                    key={c.id}
                    className={cn(
                      "rounded-sm px-2 py-0.5 text-label font-medium",
                      certificateExpiryClass(c.expiryDate)
                    )}
                  >
                    {formatDate(c.expiryDate)} — {certificationStatus(c.expiryDate)}
                  </span>,
                  c.filePath ?? "—",
                  <div key={c.id} className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!c.filePath}
                      onClick={() => c.filePath && window.open(c.filePath, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" disabled>
                      Delete
                    </Button>
                  </div>,
                ])}
                empty="No certificates uploaded."
              />
            </div>
          )}

          {/* ── Performance tab ── */}
          {tab === "performance" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Metric label="Delivery" value={`${latestPerf?.onTimeDeliveryPct ?? 0}%`} />
                <Metric label="Quality" value={`${latestPerf?.qualityAcceptancePct ?? 0}%`} />
                <Metric
                  label="Responsiveness"
                  value={`${latestPerf?.responsivenessRating ?? 0}/5`}
                />
              </div>

              <SupplierPerformanceChart data={performance.data} />

              {/* Performance history table */}
              {(performance.data?.length ?? 0) > 0 && (
                <div>
                  <h3 className="mb-2 text-body font-semibold">Performance History</h3>
                  <Table
                    headers={["Period", "Delivery %", "Quality %", "Responsiveness", "Recorded At"]}
                    rows={(performance.data ?? []).map((p) => [
                      p.assessmentPeriodStart && p.assessmentPeriodEnd
                        ? `${formatDate(p.assessmentPeriodStart)} – ${formatDate(p.assessmentPeriodEnd)}`
                        : "—",
                      p.onTimeDeliveryPct !== null ? `${p.onTimeDeliveryPct}%` : "—",
                      p.qualityAcceptancePct !== null ? `${p.qualityAcceptancePct}%` : "—",
                      p.responsivenessRating !== null ? `${p.responsivenessRating}/5` : "—",
                      formatDate(p.createdAt),
                    ])}
                    empty="No performance history."
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Audits tab ── */}
          {tab === "audits" && (
            <Table
              headers={["Audit #", "Assessment Method", "Date", "Assessor", "Status", "Notes"]}
              rows={(audits.data ?? []).map((a) => [
                `AUD-${String(a.id).padStart(4, "0")}`,
                a.assessmentMethod,
                formatDate(a.assessmentDate),
                a.assessor ?? "—",
                <Badge
                  key={a.id}
                  variant={a.approvalStatus === "QUALIFIED" ? "success" : "info"}
                >
                  {a.approvalStatus ?? "Recorded"}
                </Badge>,
                a.notes ?? "—",
              ])}
              empty="No supplier audits recorded."
            />
          )}

          {/* ── Findings tab ── */}
          {tab === "findings" && (
            <div className="space-y-4">
              {/* Severity summary pills */}
              <div className="flex flex-wrap gap-2">
                <StatPill label="Critical" value={criticalCount} color="error" />
                <StatPill label="Major" value={majorCount} color="warning" />
                <StatPill label="Minor" value={minorCount} color="neutral" />
              </div>

              <Table
                headers={[
                  "Finding Date",
                  "Description",
                  "Severity",
                  "Corrective Action Linked",
                ]}
                rows={(findings.data ?? []).map((f) => [
                  formatDate(f.findingDate),
                  f.findingDescription,
                  <SeverityBadge key={f.id} severity={f.severity} />,
                  f.correctiveActionRequired ? "CAPA required" : "No",
                ])}
                empty="No findings recorded."
              />
            </div>
          )}

          {/* ── Contact & Details tab ── */}
          {tab === "contact" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Contact Person" value={s.contactPerson ?? "—"} />
              <Field
                label="Email"
                value={
                  s.email ? (
                    <a href={`mailto:${s.email}`} className="text-brand-primary hover:underline">
                      {s.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Phone" value={s.phone ?? "—"} />
              <Field label="Location" value={s.location} />
              <Field label="Status" value={<SupplierStatusBadge status={s.status} />} />
              <Field
                label="Qualification Date"
                value={s.qualificationDate ? formatDate(s.qualificationDate) : "Not qualified"}
              />
              <Field
                label="Owner"
                value={s.ownerId ? `User #${s.ownerId}` : "Unassigned"}
              />
              <Field label="Created At" value={formatDateTime(s.createdAt)} />
              <Field label="Version" value={String(s.version)} />
            </div>
          )}

          {/* ── Audit Trail tab ── */}
          {tab === "trail" && (
            <AuditTrailTable
              entries={trail.data}
              isLoading={trail.isLoading}
              isError={trail.isError}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Qualify modal ── */}
      <SignatureModal
        open={qualifyOpen}
        onOpenChange={setQualifyOpen}
        title="Qualify Supplier"
        recordNumber={s.supplierCode}
        recordTitle={s.supplierName}
        recordNoun="supplier"
        statusNode={<SupplierStatusBadge status={s.status} />}
        isPending={action.isPending}
        successMessage="Supplier qualification submitted"
        onSign={submitQualify}
      >
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="assessmentMethod">Assessment method</Label>
            <Select
              id="assessmentMethod"
              value={assessmentMethod}
              onChange={(e) => setAssessmentMethod(e.target.value)}
            >
              <option>Document Review</option>
              <option>Audit</option>
              <option>Questionnaire</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assessmentFindings">Assessment findings</Label>
            <Textarea
              id="assessmentFindings"
              rows={3}
              value={assessmentFindings}
              onChange={(e) => setAssessmentFindings(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="approvalStatus">Approval status</Label>
            <Select
              id="approvalStatus"
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
            >
              <option>Approved</option>
              <option>Conditional</option>
              <option>Rejected</option>
            </Select>
          </div>
          {approvalStatus === "Conditional" && (
            <div className="space-y-1.5">
              <Label htmlFor="conditionalReason">Conditional reason</Label>
              <Textarea
                id="conditionalReason"
                rows={2}
                value={conditionalReason}
                onChange={(e) => setConditionalReason(e.target.value)}
              />
            </div>
          )}
        </div>
      </SignatureModal>

      {/* ── Action modals ── */}
      <ActionFormModal
        open={modal === "certificate"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Upload Certificate"
        submitLabel="Upload"
        isPending={action.isPending}
        successMessage="Certificate uploaded"
        fields={[
          {
            name: "certType",
            label: "Certificate type",
            type: "select",
            options: ["ISO 9001", "ISO 13485", "GMP", "GDP", "Other"].map((v) => ({
              value: v,
              label: v,
            })),
          },
          { name: "issueDate", label: "Issue date", type: "date" },
          { name: "expiryDate", label: "Expiry date", type: "date" },
          { name: "filePath", label: "File path or URL", type: "text" },
        ]}
        onSubmit={async (v) =>
          action.mutateAsync({
            path: "upload-certificate",
            body: {
              certType: v.certType,
              issueDate: toInstant(v.issueDate),
              expiryDate: toInstant(v.expiryDate),
              filePath: v.filePath,
            },
          })
        }
      />

      <ActionFormModal
        open={modal === "performance"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Record Performance"
        submitLabel="Record"
        isPending={action.isPending}
        successMessage="Performance recorded"
        fields={[
          {
            name: "period",
            label: "Period (month/year)",
            type: "text",
            placeholder: "2026-06",
            required: true,
          },
          {
            name: "onTimeDeliveryPct",
            label: "On-time delivery %",
            type: "number",
            required: true,
          },
          {
            name: "qualityAcceptancePct",
            label: "Quality acceptance %",
            type: "number",
            required: true,
          },
          {
            name: "responsivenessRating",
            label: "Responsiveness rating",
            type: "select",
            options: [1, 2, 3, 4, 5].map((v) => ({
              value: String(v),
              label: `${v} star${v > 1 ? "s" : ""}`,
            })),
          },
        ]}
        onSubmit={async (v) => {
          const p = periodRange(v.period);
          await action.mutateAsync({
            path: "record-performance",
            body: {
              assessmentPeriodStart: p.start,
              assessmentPeriodEnd: p.end,
              onTimeDeliveryPct: Number(v.onTimeDeliveryPct),
              qualityAcceptancePct: Number(v.qualityAcceptancePct),
              responsivenessRating: Number(v.responsivenessRating),
            },
          });
        }}
      />

      <ActionFormModal
        open={modal === "audit"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Schedule New Audit"
        isPending={action.isPending}
        successMessage="Audit scheduled"
        fields={[
          { name: "auditDate", label: "Audit date", type: "date", required: true },
          { name: "auditor", label: "Auditor", type: "text" },
        ]}
        onSubmit={async (v) =>
          action.mutateAsync({
            path: "schedule-audit",
            body: { auditDate: toInstant(v.auditDate), auditor: v.auditor },
          })
        }
      />

      <ActionFormModal
        open={modal === "finding"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Create Finding"
        isPending={action.isPending}
        successMessage="Finding created"
        fields={[
          {
            name: "findingDescription",
            label: "Finding description",
            type: "textarea",
            required: true,
          },
          {
            name: "severity",
            label: "Severity",
            type: "select",
            options: ["CRITICAL", "MAJOR", "MINOR"].map((v) => ({
              value: v,
              label: v[0] + v.slice(1).toLowerCase(),
            })),
          },
          {
            name: "createCapa",
            label: "Create CAPA for this finding",
            type: "select",
            options: [
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ],
          },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "issue-finding",
            body: {
              findingDescription: v.findingDescription,
              severity: v.severity,
              correctiveActionRequired: v.createCapa === "true",
            },
          });
          toast.message(
            v.createCapa === "true"
              ? "Finding created; CAPA linkage is flagged for QA follow-up."
              : "Finding recorded."
          );
        }}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-label text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-body font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="text-h2 text-brand-primary">{value}</p>
    </div>
  );
}

function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0)
    return <p className="text-body text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-border text-left">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-label uppercase text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "success" | "warning" | "error" | "neutral";
}) {
  const cls = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-[#7A5A00]",
    error: "bg-error/15 text-error",
    neutral: "bg-muted text-muted-foreground",
  }[color];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label font-semibold",
        cls
      )}
    >
      <span className="text-base font-bold">{value}</span>
      {label}
    </span>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function toInstant(date: string) {
  return date ? new Date(`${date}T00:00:00.000Z`).toISOString() : null;
}

function periodRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(
    Date.UTC(year || new Date().getUTCFullYear(), (month || 1) - 1, 1)
  );
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}
