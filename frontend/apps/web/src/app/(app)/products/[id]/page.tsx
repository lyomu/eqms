"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useAddProductEvidence,
  useApproveProduct,
  useProduct,
  useProductApprovalHistory,
  useProductAudit,
  useProductIsoReadiness,
  useProductSection,
  useProductTraceability,
  useProductTransition,
  type ProductAction,
} from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { ProductStatusBadge } from "@/components/products/ProductStatusBadge";
import { ReasonModal } from "@/components/common/ReasonModal";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { sanitizeHtml } from "@/lib/html";
import { formatDate } from "@/lib/format";
import {
  PRODUCT_CRITICALITY_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
  type IsoReadiness,
  type ProductEvidence,
} from "@/types/product";

const TABS = [
  "Overview",
  "Product Details",
  "Specifications",
  "Materials / Components",
  "Process / Manufacturing Info",
  "QC & Release Requirements",
  "Documents",
  "Batches / Lots",
  "Quality Issues",
  "Change Control",
  "Risk Assessment",
  "Traceability",
  "Approval History",
  "Audit Trail",
] as const;
type Tab = typeof TABS[number];

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const product = useProduct(id);
  const audit = useProductAudit(id);
  const history = useProductApprovalHistory(id);
  const traceability = useProductTraceability(id);
  const readiness = useProductIsoReadiness(id);
  const transition = useProductTransition();
  const approve = useApproveProduct();
  const users = useUsers();
  const [tab, setTab] = useState<Tab>("Overview");
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: ProductAction; title: string; defaultReason: string }>(null);

  const ownerName = useMemo(() => {
    const by = product.data?.ownerId ?? product.data?.createdBy;
    if (!by) return "-";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [product.data, users.data]);

  if (product.isLoading) return <LoadingScreen label="Loading product..." />;
  if (product.isError || !product.data) return <ErrorAlert title="Error" message="Failed to load this product." />;
  const p = product.data;

  async function runAction(act: ProductAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: p.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function requestReasonAction(act: ProductAction, title: string, defaultReason: string) {
    setReasonAction({ action: act, title, defaultReason });
  }

  const warnings = [
    p.status !== "ACTIVE" ? "Product is not approved for active use." : null,
    !p.specificationReference ? "Specification reference is missing." : null,
    readiness.data && !readiness.data.ready ? "ISO readiness blockers must be cleared before approval." : null,
    p.status === "ON_HOLD" || p.status === "DISCONTINUED" ? "Product is suspended or obsolete." : null,
    p.nextReviewDate && new Date(p.nextReviewDate) <= new Date() ? "Product is due for review." : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/products" className="hover:underline">Product Management</Link>
            <span>/</span>
            <span>{p.productCode}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProductStatusBadge status={p.status} />
            <span className="text-label text-muted-foreground">Rev {p.revision || "A"}</span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {p.status === "DRAFT" && (
            <>
              <Button asChild variant="outline"><Link href={`/products/${id}/edit`}>Edit</Link></Button>
              <Button onClick={() => runAction("submit", "Submitted for review")} disabled={transition.isPending}>Submit for Review</Button>
            </>
          )}
          {p.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("reject", "Reject Product", "Rejected")} disabled={transition.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)} disabled={readiness.isLoading || readiness.data?.ready === false}>Approve Product</Button>
            </>
          )}
          {p.status === "ACTIVE" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("revise", "Create Revision", "Revision required")} disabled={transition.isPending}>Create Revision</Button>
              <Button variant="outline" onClick={() => requestReasonAction("suspend", "Suspend Product", "Suspended")} disabled={transition.isPending}>Suspend</Button>
              <Button variant="outline" onClick={() => requestReasonAction("obsolete", "Archive/Obsolete Product", "Obsoleted")} disabled={transition.isPending}>Archive/Obsolete</Button>
            </>
          )}
          {p.status === "ON_HOLD" && <Button onClick={() => runAction("resume", "Reactivated")} disabled={transition.isPending}>Reactivate</Button>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border pb-2">
        {TABS.map((item) => (
          <button key={item} className={`whitespace-nowrap rounded-md px-3 py-2 text-label ${tab === item ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-4">
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w) => <div key={w} className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-body">{w}</div>)}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card><CardHeader><CardTitle>Lifecycle</CardTitle></CardHeader><CardContent className="space-y-3">
              <Field label="Status" value={<ProductStatusBadge status={p.status} />} />
              <Field label="Version/Revision" value={p.revision || "-"} />
              <Field label="Specification Status" value={p.specificationStatus || "-"} />
              <Field label="Owner" value={ownerName} />
              <Field label="Criticality" value={PRODUCT_CRITICALITY_LABELS[p.criticality]} />
              <Field label="Next Review" value={p.nextReviewDate ? formatDate(p.nextReviewDate) : "-"} />
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Quality Signals</CardTitle></CardHeader><CardContent className="space-y-3">
              <Metric label="Linked materials/components" value={traceability.data?.materials.length} />
              <Metric label="Open deviations/CAPA/OOS/OOT/complaints" value={traceability.data?.qualityIssues.length} />
              <Metric label="Linked documents" value={traceability.data?.documents.length} />
              <Metric label="Risk assessments" value={traceability.data?.risks.length} />
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent className="space-y-2">
              {(history.data ?? []).slice(0, 5).map((h) => <div key={h.id} className="text-body"><span className="font-medium">{h.action}</span> {formatDate(h.actionAt)}</div>)}
              {!history.data?.length && <p className="text-body text-muted-foreground">No approval history yet.</p>}
            </CardContent></Card>
          </div>
          <IsoReadinessPanel readiness={readiness.data} isLoading={readiness.isLoading} />
        </div>
      )}

      {tab === "Product Details" && (
        <Card><CardHeader><CardTitle>Product Details</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Product Type" value={label(PRODUCT_TYPE_LABELS, p.productType)} />
            <Field label="Category" value={p.category || "-"} />
            <Field label="Department" value={p.department || "-"} />
            <Field label="Site/Location" value={p.siteLocation || "-"} />
            <Field label="Shelf Life" value={p.shelfLife || "-"} />
            <Field label="Batch/Lot Tracking" value={p.batchLotTrackingRequired ? "Yes" : "No"} />
            <Field label="QC Testing" value={p.qcTestingRequired ? "Yes" : "No"} />
            <Field label="Expiry Required" value={p.expiryRequired ? "Yes" : "No"} />
          </div>
          <HtmlBlock title="Description" value={p.description} />
          <HtmlBlock title="Intended Use" value={p.intendedUse} />
          <HtmlBlock title="Storage Requirements" value={p.storageRequirements} />
          <HtmlBlock title="Regulatory/Customer Requirements" value={p.regulatoryCustomerRequirements} />
          <HtmlBlock title="Notes" value={p.notes} />
        </CardContent></Card>
      )}

      {tab === "Specifications" && <EvidenceSection id={id} title="Specifications" section="specifications" fields={["specificationReference", "documentName", "revision", "status", "testParameters", "acceptanceCriteria"]} />}
      {tab === "Materials / Components" && <EvidenceSection id={id} title="Materials / Components" section="materials" fields={["materialName", "materialCode", "quantityRatio", "uom", "materialCriticality", "status", "notes"]} />}
      {tab === "Process / Manufacturing Info" && <EvidenceSection id={id} title="Process / Manufacturing Info" section="process" fields={["processName", "processOwner", "siteDepartment", "relatedSops", "equipmentRequired", "processParameters", "notes"]} />}
      {tab === "QC & Release Requirements" && <EvidenceSection id={id} title="QC & Release Requirements" section="qc-requirements" fields={["testMethods", "acceptanceCriteria", "samplingRequirements", "qaReleaseRole"]} />}
      {tab === "Documents" && <EvidenceSection id={id} title="Documents" section="documents" fields={["documentType", "documentName", "documentVersion", "status", "notes"]} />}
      {tab === "Quality Issues" && <EvidenceSection id={id} title="Quality Issues" section="quality-issues" fields={["recordType", "referenceNumber", "title", "severity", "status", "owner", "notes"]} />}
      {tab === "Change Control" && <EvidenceSection id={id} title="Change Control" section="change-control" fields={["changeType", "referenceNumber", "title", "status", "owner", "notes"]} />}
      {tab === "Risk Assessment" && <EvidenceSection id={id} title="Risk Assessment" section="risks" fields={["riskReference", "riskLevel", "riskOwner", "inherentRisk", "controls", "residualRisk", "status"]} />}
      {tab === "Batches / Lots" && <EvidenceList title="Batches / Lots" rows={traceability.data?.batches ?? []} />}
      {tab === "Traceability" && <TraceabilityPanel traceability={traceability.data} />}
      {tab === "Approval History" && <HistoryPanel rows={history.data ?? []} />}
      {tab === "Audit Trail" && <Card><CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader><CardContent><AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} /></CardContent></Card>}

      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Product"
        recordNumber={p.productCode}
        recordTitle={p.name}
        recordNoun="product"
        statusNode={<ProductStatusBadge status={p.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: p.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
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
          await transition.mutateAsync({ id, action: reasonAction.action, expectedVersion: p.version, reason });
        }}
      />
    </div>
  );
}

function EvidenceSection({ id, title, section, fields }: { id: number; title: string; section: string; fields: string[] }) {
  const rows = useProductSection(id, section);
  const add = useAddProductEvidence(id, section);
  const [values, setValues] = useState<Record<string, string>>({});
  const richFields = new Set(["notes", "title", "testParameters", "acceptanceCriteria", "relatedSops", "equipmentRequired", "processParameters", "inherentRisk", "controls", "residualRisk"]);

  async function submit() {
    await add.mutateAsync(values);
    setValues({});
    toast.success("Linked record saved");
  }

  return (
    <div className="space-y-4">
      <EvidenceList title={title} rows={rows.data ?? []} />
      <Card>
        <CardHeader><CardTitle>Add {title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label>{humanize(field)}</Label>
                {field === "status" ? (
                  <Select value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}>
                    <option value="">Select status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                  </Select>
                ) : richFields.has(field) ? (
                  <RichTextEditor value={values[field] ?? ""} onChange={(value) => setValues((v) => ({ ...v, [field]: value }))} minHeight={120} />
                ) : (
                  <Input value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={add.isPending}>{add.isPending ? "Saving..." : "Save Link"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EvidenceList({ title, rows }: { title: string; rows: ProductEvidence[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-body text-muted-foreground">No records linked yet.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-body">
              <thead className="text-label text-muted-foreground"><tr><th className="py-2 pr-4">Reference</th><th className="py-2 pr-4">Name/Title</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Owner</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="py-2 pr-4">{string(row.values.reference)}</td><td className="py-2 pr-4">{string(row.values.name || row.values.title)}</td><td className="py-2 pr-4">{string(row.values.type)}</td><td className="py-2 pr-4">{string(row.values.status)}</td><td className="py-2 pr-4">{string(row.values.owner)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TraceabilityPanel({ traceability }: { traceability?: { specifications: ProductEvidence[]; materials: ProductEvidence[]; batches: ProductEvidence[]; documents: ProductEvidence[]; qualityIssues: ProductEvidence[]; risks: ProductEvidence[]; changeControls: ProductEvidence[] } }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <EvidenceList title="Product -> Specification" rows={traceability?.specifications ?? []} />
      <EvidenceList title="Specification -> Materials" rows={traceability?.materials ?? []} />
      <EvidenceList title="Batches/Lots Produced" rows={traceability?.batches ?? []} />
      <EvidenceList title="QC/Release and Documents" rows={traceability?.documents ?? []} />
      <EvidenceList title="Quality Issues" rows={traceability?.qualityIssues ?? []} />
      <EvidenceList title="Risks and Change Controls" rows={[...(traceability?.risks ?? []), ...(traceability?.changeControls ?? [])]} />
    </div>
  );
}

function HistoryPanel({ rows }: { rows: { id: number; action: string; actorName: string | null; comment: string | null; actionAt: string }[] }) {
  return (
    <Card><CardHeader><CardTitle>Approval History</CardTitle></CardHeader><CardContent>
      {rows.length === 0 ? <p className="text-body text-muted-foreground">No approval history yet.</p> : rows.map((row) => (
        <div key={row.id} className="border-b border-border py-3 last:border-0">
          <div className="font-medium">{row.action}</div>
          <div className="text-label text-muted-foreground">{row.actorName || "System"} - {formatDate(row.actionAt)}</div>
          {row.comment && <HtmlBlock title="" value={row.comment} />}
        </div>
      ))}
    </CardContent></Card>
  );
}

function IsoReadinessPanel({ readiness, isLoading }: { readiness?: IsoReadiness; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>ISO Readiness</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-body text-muted-foreground">Checking readiness...</p>}
        {!isLoading && readiness && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 text-label ${readiness.ready ? "bg-success text-white" : "bg-error/15 text-error"}`}>
                {readiness.ready ? "Ready for approval" : "Blocked"}
              </span>
              <span className="text-body text-muted-foreground">Readiness score: {readiness.score}%</span>
            </div>
            {readiness.blockingMessages.length > 0 && (
              <div className="space-y-2">
                {readiness.blockingMessages.map((message) => (
                  <div key={message} className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-body text-error">
                    {message}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {readiness.items.map((item) => (
                <div key={item.code} className="rounded-md border border-border px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-label text-muted-foreground">
                        {item.required ? "Required" : "Conditional"} - {item.severity} - Evidence: {item.evidenceCount}
                      </div>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-label ${item.status === "PASS" ? "bg-success text-white" : "bg-warning/20 text-[#8A6D00]"}`}>
                      {item.status === "PASS" ? "Pass" : "Fail"}
                    </span>
                  </div>
                  <p className="mt-2 text-body text-muted-foreground">{item.message}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HtmlBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      {title && <div className="text-label text-muted-foreground">{title}</div>}
      <div className="rich-text-content rounded-md border border-border px-3 py-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || "-") }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-label text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>;
}

function Metric({ label, value }: { label: string; value?: number }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-body">{label}</span><span className="text-h3 text-brand-primary">{value ?? "-"}</span></div>;
}

function label(labels: Record<string, string>, value?: string | null) {
  return value ? labels[value] ?? value.replace(/_/g, " ") : "-";
}

function string(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
