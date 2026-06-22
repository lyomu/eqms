"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  MinusCircle,
  PlusCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useComplaint, useComplaintAudit, useComplaintAction } from "@/hooks/useComplaint";
import { useUsers } from "@/hooks/useDocuments";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { ReasonModal } from "@/components/common/ReasonModal";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ComplaintStatusBadge } from "@/components/complaints/ComplaintStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { sanitizeHtml } from "@/lib/html";
import {
  SEVERITY_VARIANT,
  type ComplaintResponse,
} from "@/types/complaint";

// ─── Section types ───────────────────────────────────────────────────────────

type SectionKey =
  | "containment"
  | "keywords"
  | "notes"
  | "documents"
  | "payment"
  | "emails"
  | "investigation"
  | "close";

type ObjectKey = "nc" | "rootcause" | "correction";

const INITIAL_SECTIONS: Record<SectionKey, boolean> = {
  containment: false,
  keywords: false,
  notes: false,
  documents: false,
  payment: false,
  emails: false,
  investigation: false,
  close: false,
};

const EMAIL_TEMPLATES = [
  ["Logged", "Complaint Logged"],
  ["Acknowledged", "Complaint Acknowledged"],
  ["Under Investigation", "Complaint Under Investigation"],
  ["Resolved", "Complaint Resolved"],
  ["Closed", "Complaint Closed"],
  ["Cancelled", "Complaint Cancelled"],
];

const ROOT_CAUSE_METHODS = ["5 Whys", "Fishbone", "FMEA", "RCA", "Fault Tree Analysis"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const complaint = useComplaint(id);
  const audit = useComplaintAudit(id);
  const action = useComplaintAction(id);
  const users = useUsers();

  const [sections, setSections] = useState<Record<SectionKey, boolean>>(INITIAL_SECTIONS);
  const [activeObject, setActiveObject] = useState<ObjectKey | null>(null);

  // Local-only draft state (UI-only sections: containment, keywords, documents, payment, emails)
  const [keywords, setKeywords] = useState("");
  const [containmentNotes, setContainmentNotes] = useState("");

  // Investigation drafts — pre-populated from server data
  const [investFindings, setInvestFindings] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [rootCauseMethod, setRootCauseMethod] = useState("");
  const [impactOnProduct, setImpactOnProduct] = useState("");
  const [resolutionDesc, setResolutionDesc] = useState("");
  const [linkedCapaId, setLinkedCapaId] = useState("");

  // Close section draft
  const [closureEmail, setClosureEmail] = useState("");
  const [closureComment, setClosureComment] = useState("");

  // Modal states
  const [ackOpen, setAckOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const ownerName = useMemo(() => {
    const by = complaint.data?.ownerId ?? complaint.data?.createdBy;
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [complaint.data, users.data]);

  // Pre-populate investigation drafts when data loads
  useMemo(() => {
    const inv = complaint.data?.investigation;
    if (inv) {
      setInvestFindings(inv.investigationFindings ?? "");
      setRootCause(inv.rootCause ?? "");
      setRootCauseMethod(inv.rootCauseMethod ?? "");
      setImpactOnProduct(inv.impactOnProduct ?? "");
    }
    if (complaint.data?.resolution) {
      setResolutionDesc(complaint.data.resolution.resolutionDescription ?? "");
    }
    if (complaint.data) {
      setClosureEmail(ownerName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint.data?.id, complaint.data?.version]);

  if (complaint.isLoading) return <LoadingScreen label="Loading complaint…" />;
  if (complaint.isError || !complaint.data) return <ErrorAlert title="Error" message="Failed to load this complaint." />;

  const c = complaint.data;
  const inv = c.investigation;

  function toggleSection(key: SectionKey) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function runAction(path: string, body: Record<string, unknown>, successMsg: string) {
    try {
      await action.mutateAsync({ path, body });
      toast.success(successMsg);
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function openCloseSection() {
    setSections((prev) => ({ ...prev, close: true }));
    setClosureEmail(ownerName);
    requestAnimationFrame(() =>
      document.getElementById("complaint-close-section")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const canInvestigate = c.status === "ACKNOWLEDGED";
  const canRootCause = c.status === "UNDER_INVESTIGATION";
  const canResolve = c.status === "UNDER_INVESTIGATION";
  const canClose = c.status === "RESOLVED";
  const canAcknowledge = c.status === "OPEN";
  const canCancel = !["CLOSED", "CANCELLED"].includes(c.status);

  const actionRequired = canAcknowledge || canInvestigate || canRootCause || canResolve;

  return (
    <div className="space-y-3">
      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/complaints">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>
        {actionRequired && (
          <Button className="bg-warning text-slate-950 hover:bg-warning/90" onClick={() => {
            if (canAcknowledge) setAckOpen(true);
            else if (canInvestigate) setSections((prev) => ({ ...prev, investigation: true }));
            else if (canRootCause) setActiveObject("rootcause");
            else if (canResolve) setActiveObject("correction");
          }}>
            <Eye className="h-4 w-4" />
            Action Required
          </Button>
        )}
        {canClose && (
          <Button onClick={openCloseSection}>Close Complaint</Button>
        )}
        {canCancel && (
          <Button variant="ghost" onClick={() => setCancelOpen(true)} disabled={action.isPending}>
            Cancel
          </Button>
        )}
      </div>

      {/* ── Header fields ── */}
      <section className="rounded-md bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <ReadOnlyField label="Number" value={c.complaintNo} />
            <ReadOnlyField label="Source" value={c.source} />
            <ReadOnlyField label="Severity" value={<Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>} />
          </div>
          <div className="space-y-3">
            <ReadOnlyField label="Date" value={formatDateTime(c.createdAt).replace(" UTC", "")} />
            <ReadOnlyField label="Owner" value={ownerName} />
            <ReadOnlyField
              label="History"
              value={
                <button
                  type="button"
                  className="font-semibold text-brand-primary hover:underline"
                  onClick={() => toggleSection("notes")}
                >
                  View
                </button>
              }
            />
          </div>
        </div>
      </section>

      {/* ── FROM / ABOUT dual cards ── */}
      <section className="rounded-md bg-muted/30 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-h3">FROM:</h2>
            <OrangeBox title="FROM: Reporter">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReadOnlyField label="Reported By" value={c.reportedBy || "—"} />
                <ReadOnlyField label="Reported Date" value={c.reportedDate ? formatDate(c.reportedDate) : "—"} />
                <ReadOnlyField label="Source" value={c.source} />
              </div>
            </OrangeBox>
          </div>
          <div className="space-y-3">
            <h2 className="text-h3">ABOUT:</h2>
            <OrangeBox title="ABOUT: Complaint">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReadOnlyField label="Product ID" value={c.productId ? String(c.productId) : "—"} />
                <ReadOnlyField label="Severity" value={<Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>} />
                {c.closedDate && <ReadOnlyField label="Closed Date" value={formatDate(c.closedDate)} />}
              </div>
            </OrangeBox>
          </div>
        </div>
      </section>

      {/* ── DETAILS status strip ── */}
      <section className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <StripField label="ASSIGNED TO" value={ownerName} />
          <StripField label="STATUS" value={<ComplaintStatusBadge status={c.status} />} />
          <StripField label="SEVERITY" value={<Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>} />
        </div>
        <div className="bg-background p-4">
          <div className="rounded-md border border-border bg-card p-4">
            <p className="text-label text-success">
              Received: {formatDateTime(c.createdAt).replace(" UTC", "")}
            </p>
            <RichTextDisplay value={c.complaintDescription} className="mt-1 text-body" />
          </div>
        </div>
      </section>

      {/* ── CONTAINMENT ── */}
      <CollapsibleSection
        title="CONTAINMENT:"
        open={sections.containment}
        status={containmentNotes ? "complete" : "empty"}
        onToggle={() => toggleSection("containment")}
      >
        <SectionTextArea
          label="Containment Notes"
          value={containmentNotes}
          onChange={setContainmentNotes}
          onSubmit={() => toast.success("Containment notes saved locally")}
          onClear={() => setContainmentNotes("")}
          onClose={() => toggleSection("containment")}
        />
      </CollapsibleSection>

      {/* ── KEYWORDS ── */}
      <CollapsibleSection
        title="KEYWORDS:"
        open={sections.keywords}
        status={keywords ? "complete" : "empty"}
        onToggle={() => toggleSection("keywords")}
      >
        <div className="space-y-2">
          <Label>Keywords:</Label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Add comma-separated keywords"
            className="border border-border bg-background"
          />
          <SectionButtons
            onSubmit={() => toast.success("Keywords saved locally")}
            onClear={() => setKeywords("")}
            onClose={() => toggleSection("keywords")}
          />
        </div>
      </CollapsibleSection>

      {/* ── NOTES ── */}
      <CollapsibleSection
        title="NOTES:"
        open={sections.notes}
        status="complete"
        onToggle={() => toggleSection("notes")}
      >
        <div className="rounded-md border border-border bg-background p-4">
          <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
        </div>
      </CollapsibleSection>

      {/* ── DOCUMENTS ── */}
      <CollapsibleSection
        title="DOCUMENTS:"
        open={sections.documents}
        status="empty"
        onToggle={() => toggleSection("documents")}
      >
        <DocumentsPanel onClose={() => toggleSection("documents")} />
      </CollapsibleSection>

      {/* ── PAYMENT ── */}
      <CollapsibleSection
        title="PAYMENT:"
        open={sections.payment}
        status="complete"
        onToggle={() => toggleSection("payment")}
      >
        <PaymentPanel onClose={() => toggleSection("payment")} />
      </CollapsibleSection>

      {/* ── EMAILS ── */}
      <CollapsibleSection
        title="EMAILS:"
        open={sections.emails}
        status="attention"
        onToggle={() => toggleSection("emails")}
      >
        <EmailsPanel ownerName={ownerName} complaint={c} onClose={() => toggleSection("emails")} />
      </CollapsibleSection>

      {/* ── INVESTIGATION ── */}
      <CollapsibleSection
        title="INVESTIGATION:"
        open={sections.investigation}
        status={inv?.investigationFindings ? "complete" : "empty"}
        onToggle={() => toggleSection("investigation")}
      >
        <div className="space-y-4 bg-warning/20 p-4">
          <div>
            <p className="text-body font-semibold">
              <MinusCircle className="mr-2 inline h-5 w-5 text-success" />
              Add Investigation Details
            </p>
            <Label className="mt-3 block">Investigation Details:</Label>
            <RichTextEditor
              value={investFindings}
              minHeight={220}
              disabled={!canInvestigate}
              onChange={setInvestFindings}
            />
          </div>
          <div className="space-y-2">
            <Label>Documents:</Label>
            <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90">
              Click to Upload
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!canInvestigate || action.isPending || !investFindings.trim()}
              className="bg-warning text-slate-950 hover:bg-warning/90"
              onClick={() =>
                runAction(
                  "investigate",
                  { expectedVersion: c.version, investigationFindings: investFindings, reason: "Investigation details recorded" },
                  "Investigation saved",
                )
              }
            >
              {action.isPending ? "Saving…" : "Submit"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setInvestFindings(inv?.investigationFindings ?? "")}>
              Clear
            </Button>
            <Button type="button" variant="secondary" onClick={() => toggleSection("investigation")}>
              Close
            </Button>
          </div>
          <div className="space-y-3">
            <p className="text-body font-semibold">
              <PlusCircle className="mr-2 inline h-5 w-5 text-success" />
              Send an Investigation Notification
            </p>
            <TransferShell
              title={`Showing all ${users.data?.length ?? 0}`}
              items={users.data?.map((u) => u.fullName) ?? []}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── NC / ROOT CAUSE / CORRECTION tile panel ── */}
      <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
        <ObjectTile
          active={activeObject === "nc"}
          title="Non-Conformance"
          subtitle="Impact Assessment"
          value={inv?.impactOnProduct ?? null}
          onClick={() => setActiveObject(activeObject === "nc" ? null : "nc")}
        />
        <ObjectTile
          active={activeObject === "rootcause"}
          title="Root Cause"
          subtitle={inv?.rootCauseMethod ?? "Analysis Method"}
          value={inv?.rootCause ?? null}
          onClick={() => setActiveObject(activeObject === "rootcause" ? null : "rootcause")}
        />
        <ObjectTile
          active={activeObject === "correction"}
          title="Correction / Resolution"
          subtitle={c.resolution?.resolutionDate ? `Resolved: ${formatDate(c.resolution.resolutionDate)}` : "Resolution"}
          value={c.resolution?.resolutionDescription ?? null}
          onClick={() => setActiveObject(activeObject === "correction" ? null : "correction")}
        />
      </div>

      {activeObject === "nc" && (
        <ObjectEditorPanel
          title="Non-Conformance: Impact Assessment"
          canEdit={canRootCause}
          pending={action.isPending}
          onClose={() => setActiveObject(null)}
        >
          <div className="space-y-2">
            <Label>Impact on Product / Patients:</Label>
            <RichTextEditor value={impactOnProduct} minHeight={180} disabled={!canRootCause} onChange={setImpactOnProduct} />
          </div>
          <SectionButtons
            pending={action.isPending}
            onSubmit={() =>
              runAction("impact-assessment", { impactOnProduct, reason: "Impact assessment recorded" }, "Impact assessment saved")
            }
            onClear={() => setImpactOnProduct(inv?.impactOnProduct ?? "")}
            onClose={() => setActiveObject(null)}
          />
        </ObjectEditorPanel>
      )}

      {activeObject === "rootcause" && (
        <ObjectEditorPanel
          title="Root Cause Analysis"
          canEdit={canRootCause}
          pending={action.isPending}
          onClose={() => setActiveObject(null)}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Root Cause:</Label>
              <RichTextEditor value={rootCause} minHeight={180} disabled={!canRootCause} onChange={setRootCause} />
            </div>
            <div className="space-y-2">
              <Label>Analysis Method:</Label>
              <Select
                value={rootCauseMethod}
                disabled={!canRootCause}
                onChange={(e) => setRootCauseMethod(e.target.value)}
              >
                <option value="">Select method…</option>
                {ROOT_CAUSE_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
              {c.linkedCapaIds.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-label font-semibold">Linked CAPAs:</p>
                  {c.linkedCapaIds.map((cid) => (
                    <Link key={cid} href={`/capa/${cid}`} className="block text-brand-secondary hover:underline">
                      CAPA #{cid}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <Label>Link CAPA:</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={linkedCapaId}
                    onChange={(e) => setLinkedCapaId(e.target.value)}
                    placeholder="CAPA ID"
                    className="border border-border bg-background"
                    disabled={!canRootCause}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canRootCause || !linkedCapaId || action.isPending}
                    onClick={() => {
                      runAction("link-capa", { capaId: Number(linkedCapaId) }, "CAPA linked");
                      setLinkedCapaId("");
                    }}
                  >
                    Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <SectionButtons
            pending={action.isPending}
            onSubmit={() =>
              runAction(
                "root-cause-analysis",
                { rootCause, rootCauseMethod: rootCauseMethod || undefined, reason: "Root cause analysis recorded" },
                "Root cause saved",
              )
            }
            onClear={() => {
              setRootCause(inv?.rootCause ?? "");
              setRootCauseMethod(inv?.rootCauseMethod ?? "");
            }}
            onClose={() => setActiveObject(null)}
          />
        </ObjectEditorPanel>
      )}

      {activeObject === "correction" && (
        <ObjectEditorPanel
          title="Correction / Resolution"
          canEdit={canResolve}
          pending={action.isPending}
          onClose={() => setActiveObject(null)}
        >
          <div className="space-y-2">
            <Label>Resolution Description:</Label>
            <RichTextEditor
              value={resolutionDesc}
              minHeight={180}
              disabled={!canResolve}
              onChange={setResolutionDesc}
            />
          </div>
          <SectionButtons
            pending={action.isPending}
            onSubmit={() =>
              runAction(
                "resolution",
                { expectedVersion: c.version, resolutionDescription: resolutionDesc, reason: "Resolution recorded" },
                "Resolution saved",
              )
            }
            onClear={() => setResolutionDesc(c.resolution?.resolutionDescription ?? "")}
            onClose={() => setActiveObject(null)}
          />
        </ObjectEditorPanel>
      )}

      {/* ── CLOSE ── */}
      <div id="complaint-close-section">
        <CollapsibleSection
          title="CLOSE:"
          open={sections.close}
          status={c.status === "CLOSED" ? "attention" : "empty"}
          onToggle={() => toggleSection("close")}
        >
          <div className="space-y-4">
            {c.status !== "RESOLVED" && c.status !== "CLOSED" && (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-body">
                <p className="font-semibold">
                  This complaint must be in RESOLVED status before it can be closed.
                </p>
              </div>
            )}
            {(c.status === "RESOLVED" || c.status === "CLOSED") && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Status:</Label>
                    <div className="flex min-h-11 items-center rounded-md border border-border bg-background px-4 py-3">
                      <ComplaintStatusBadge status={c.status} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email:</Label>
                    <Input
                      value={closureEmail}
                      onChange={(e) => setClosureEmail(e.target.value)}
                      className="border border-border bg-background"
                      disabled={c.status === "CLOSED"}
                    />
                  </div>
                </div>
                <SectionTextArea
                  label="Closure Comment"
                  value={closureComment}
                  onChange={setClosureComment}
                  onSubmit={() => {
                    if (c.status === "CLOSED") return;
                    setCloseOpen(true);
                  }}
                  onClear={() => setClosureComment("")}
                  onClose={() => toggleSection("close")}
                  pending={action.isPending}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Signature modals ── */}
      <SignatureModal
        open={ackOpen}
        onOpenChange={setAckOpen}
        title="Acknowledge Complaint"
        recordNumber={c.complaintNo}
        recordTitle={c.complaintDescription}
        recordNoun="complaint"
        statusNode={<ComplaintStatusBadge status={c.status} />}
        isPending={action.isPending}
        successMessage="Complaint acknowledged"
        onSign={async (creds) => {
          await action.mutateAsync({
            path: "acknowledge",
            body: {
              expectedVersion: c.version,
              reason: creds.reason || "Acknowledged",
              password: creds.password,
              totpCode: creds.totpCode,
              meaningStatement: creds.meaningStatement,
            },
          });
        }}
      />

      <SignatureModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close Complaint"
        recordNumber={c.complaintNo}
        recordTitle={c.complaintDescription}
        recordNoun="complaint"
        statusNode={<ComplaintStatusBadge status={c.status} />}
        isPending={action.isPending}
        successMessage="Complaint closed"
        onSign={async (creds) => {
          await action.mutateAsync({
            path: "close",
            body: {
              expectedVersion: c.version,
              reason: closureComment || creds.reason || "Closed",
              password: creds.password,
              totpCode: creds.totpCode,
              meaningStatement: creds.meaningStatement,
            },
          });
        }}
      >
        {closureComment ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-body">
            <p className="text-label font-semibold text-muted-foreground">Closure comment:</p>
            <RichTextDisplay value={closureComment} className="mt-1" />
          </div>
        ) : null}
      </SignatureModal>

      <ReasonModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Complaint"
        defaultReason="Cancelled"
        submitLabel="Confirm"
        isPending={action.isPending}
        onSubmit={async (reason) => {
          await action.mutateAsync({ path: "cancel", body: { expectedVersion: c.version, reason } });
        }}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-label font-semibold text-foreground">{label}:</p>
      <div className="min-h-11 rounded-md border border-border bg-background px-4 py-3 text-body">{value}</div>
    </div>
  );
}

function OrangeBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-warning/70 bg-muted/20">
      <div className="border-b border-warning/30 bg-warning/20 px-4 py-3">
        <h3 className="text-body font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StripField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-2 bg-muted px-4 py-3">
      <span className="text-label font-semibold">{label}:</span>
      <span className="text-body">{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  status,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  status: "complete" | "attention" | "empty";
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-border">
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 bg-slate-200 px-4 py-3 text-left"
        onClick={onToggle}
      >
        <span className="text-body font-semibold">{title}</span>
        <StatusDot status={status} />
        <span className="ml-auto text-muted-foreground">
          {open ? <MinusCircle className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
        </span>
      </button>
      {open ? <div className="space-y-4 bg-muted/30 p-4">{children}</div> : null}
    </section>
  );
}

function StatusDot({ status }: { status: "complete" | "attention" | "empty" }) {
  if (status === "attention") return <CheckCircle2 className="h-5 w-5 text-rose-700" />;
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-success" />;
  return <PlusCircle className="h-5 w-5 text-success" />;
}

function SectionTextArea({
  label,
  value,
  pending = false,
  onChange,
  onSubmit,
  onClear,
  onClose,
}: {
  label: string;
  value: string;
  pending?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}:</Label>
      <RichTextEditor value={value} minHeight={190} onChange={onChange} aria-invalid={false} />
      <SectionButtons pending={pending} onSubmit={onSubmit} onClear={onClear} onClose={onClose} />
    </div>
  );
}

function SectionButtons({
  pending = false,
  onSubmit,
  onClear,
  onClose,
}: {
  pending?: boolean;
  onSubmit: () => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        className="bg-warning text-slate-950 hover:bg-warning/90"
        disabled={pending}
        onClick={onSubmit}
      >
        {pending ? "Saving…" : "Submit"}
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onClear}>
        Clear
      </Button>
      <Button type="button" variant="secondary" disabled={!onClose} onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

function ObjectTile({
  active,
  title,
  subtitle,
  value,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  value: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-24 w-full flex-col items-start rounded-md border p-4 text-left transition",
        active
          ? "border-brand-primary bg-brand-primary/10"
          : "border-border bg-card hover:border-brand-primary/50 hover:bg-muted/40",
      )}
    >
      <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">{subtitle}</p>
      <p className="mt-1 text-body font-semibold text-foreground">{title}</p>
      <p className="mt-1 line-clamp-2 text-label text-muted-foreground">
        {value ? stripRichText(value) : "Not recorded"}
      </p>
    </button>
  );
}

function ObjectEditorPanel({
  title,
  canEdit,
  pending,
  onClose,
  children,
}: {
  title: string;
  canEdit: boolean;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-md border border-brand-primary/20 bg-warning/10 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-body font-semibold text-brand-primary">{title}</h3>
        {!canEdit && (
          <span className="text-label text-muted-foreground">
            Read-only in current status
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function DocumentsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="max-w-2xl space-y-2">
        <Label>Select &amp; Search Internal Documents:</Label>
        <div className="flex">
          <Input placeholder="Search here…" className="border border-border bg-background" />
          <Button type="button" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransferShell title="Available documents" items={[]} />
        <TransferShell title="Selected" items={[]} />
      </div>
      <div className="space-y-2">
        <Label>External Documents:</Label>
        <Button type="button" className="bg-warning text-slate-950 hover:bg-warning/90">
          Click to Upload
        </Button>
      </div>
      <SectionButtons
        onSubmit={() => toast.success("Documents updated")}
        onClear={() => {}}
        onClose={onClose}
      />
    </div>
  );
}

function TransferShell({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-3">
        <p className="text-body">{title}</p>
        <Input className="mt-2 border border-border bg-background" placeholder="Filter" />
      </div>
      <div className="h-40 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="text-label text-muted-foreground">Empty list</p>
        ) : (
          items.map((item) => (
            <p key={item} className="text-body">
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function PaymentPanel({ onClose }: { onClose: () => void }) {
  const [payment, setPayment] = useState({
    reason: "",
    method: "",
    currency: "",
    amount: "",
    details: "",
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Reason:</Label>
          <Select
            value={payment.reason}
            onChange={(e) => setPayment((p) => ({ ...p, reason: e.target.value }))}
          >
            <option value="">Select</option>
            <option value="Refund">Refund</option>
            <option value="Replacement">Replacement</option>
            <option value="Service credit">Service credit</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Method:</Label>
          <Select
            value={payment.method}
            onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}
          >
            <option value="">Select</option>
            <option value="Bank transfer">Bank transfer</option>
            <option value="Credit note">Credit note</option>
            <option value="Cash">Cash</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Currency:</Label>
          <Select
            value={payment.currency}
            onChange={(e) => setPayment((p) => ({ ...p, currency: e.target.value }))}
          >
            <option value="">Select</option>
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Amount:</Label>
          <Input
            value={payment.amount}
            onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
            className="border border-border bg-background"
          />
        </div>
      </div>
      <SectionTextArea
        label="Details"
        value={payment.details}
        onChange={(details) => setPayment((p) => ({ ...p, details }))}
        onSubmit={() => toast.success("Payment details saved")}
        onClear={() => setPayment({ reason: "", method: "", currency: "", amount: "", details: "" })}
        onClose={onClose}
      />
    </div>
  );
}

function EmailsPanel({
  ownerName,
  complaint,
  onClose,
}: {
  ownerName: string;
  complaint: ComplaintResponse;
  onClose: () => void;
}) {
  const [email, setEmail] = useState({
    to: ownerName,
    fromName: "Super Admin",
    fromEmail: "hello@eqms.local",
    cc: "",
    subject: `${complaint.complaintNo} - Complaint`,
    body: "",
  });
  return (
    <div className="space-y-4 bg-warning/20 p-4">
      <div className="space-y-2">
        <p className="text-body font-semibold">
          <MinusCircle className="mr-2 inline h-5 w-5 text-success" />
          Send Email
        </p>
        <LabeledInput label="To Email" value={email.to} onChange={(to) => setEmail((e) => ({ ...e, to }))} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <LabeledInput
          label="From Name"
          value={email.fromName}
          onChange={(fromName) => setEmail((e) => ({ ...e, fromName }))}
        />
        <LabeledInput
          label="From Email"
          value={email.fromEmail}
          onChange={(fromEmail) => setEmail((e) => ({ ...e, fromEmail }))}
        />
        <LabeledInput label="Email CC" value={email.cc} onChange={(cc) => setEmail((e) => ({ ...e, cc }))} />
      </div>
      <LabeledInput
        label="Email Subject"
        value={email.subject}
        onChange={(subject) => setEmail((e) => ({ ...e, subject }))}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <SectionTextArea
          label="Email Body & Signature"
          value={email.body}
          onChange={(body) => setEmail((e) => ({ ...e, body }))}
          onSubmit={() => toast.success("Email draft saved")}
          onClear={() => setEmail((e) => ({ ...e, body: "" }))}
          onClose={onClose}
        />
        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border p-3 text-body font-semibold">Macros</div>
          {["{First Name}", "{Last Name}", "{Company}", "{Number}"].map((macro) => (
            <div key={macro} className="border-b border-border p-3 text-body">
              {macro}
            </div>
          ))}
        </div>
      </div>
      <p className="text-body font-semibold">
        <PlusCircle className="mr-2 inline h-5 w-5 text-success" />
        Select Template
      </p>
      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full min-w-[600px] text-body">
          <thead className="bg-slate-200 text-left">
            <tr>
              <th className="px-4 py-2">Choose</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Email Template Name</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {EMAIL_TEMPLATES.map(([status, name]) => (
              <tr key={status} className="border-t border-border">
                <td className="px-4 py-2">
                  <input type="radio" name="email-template" />
                </td>
                <td className="px-4 py-2">{status}</td>
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2">
                  <button type="button" className="text-brand-primary hover:underline">
                    Click Here to Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}:</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border bg-background"
      />
    </div>
  );
}

function RichTextDisplay({ value, className }: { value: string | null | undefined; className?: string }) {
  const html = sanitizeRichText(value);
  if (!html) return <p className={cn("text-body text-muted-foreground", className)}>-</p>;
  return <div className={cn("rich-text-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sanitizeRichText(value: string | null | undefined) {
  if (!value) return "";
  if (!looksLikeHtml(value)) return escapeHtml(value).replace(/\r?\n/g, "<br />");
  return sanitizeHtml(value);
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripRichText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
