"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useComplaint, useComplaintAudit, useComplaintAction } from "@/hooks/useComplaint";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { ComplaintStatusBadge } from "@/components/complaints/ComplaintStatusBadge";
import { ReasonModal } from "@/components/common/ReasonModal";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { SEVERITY_VARIANT } from "@/types/complaint";

type FormModal = null | "investigate" | "rootcause" | "impact" | "linkcapa" | "resolve";

export default function ComplaintDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const complaint = useComplaint(id);
  const audit = useComplaintAudit(id);
  const action = useComplaintAction(id);
  const users = useUsers();
  const [ackOpen, setAckOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [modal, setModal] = useState<FormModal>(null);

  const ownerName = useMemo(() => {
    const by = complaint.data?.ownerId ?? complaint.data?.createdBy;
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [complaint.data, users.data]);

  if (complaint.isLoading) return <LoadingScreen label="Loading complaint…" />;
  if (complaint.isError || !complaint.data) return <ErrorAlert title="Error" message="Failed to load this complaint." />;
  const c = complaint.data;
  const inv = c.investigation;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/complaints" className="hover:underline">Complaints</Link><span>/</span><span>{c.complaintNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{c.complaintNo}</h1>
          <div className="mt-1 flex items-center gap-2">
            <ComplaintStatusBadge status={c.status} />
            <Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>
            <Badge variant={c.source === "CUSTOMER" ? "info" : "neutral"}>{c.source}</Badge>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {c.status === "OPEN" && <Button onClick={() => setAckOpen(true)}>Acknowledge</Button>}
          {c.status === "ACKNOWLEDGED" && <Button onClick={() => setModal("investigate")} disabled={action.isPending}>Investigate</Button>}
          {c.status === "UNDER_INVESTIGATION" && (
            <>
              <Button variant="outline" onClick={() => setModal("rootcause")} disabled={action.isPending}>Root Cause</Button>
              <Button variant="outline" onClick={() => setModal("impact")} disabled={action.isPending}>Impact</Button>
              <Button variant="outline" onClick={() => setModal("linkcapa")} disabled={action.isPending}>Link CAPA</Button>
              <Button onClick={() => setModal("resolve")} disabled={action.isPending}>Resolve</Button>
            </>
          )}
          {c.status === "RESOLVED" && <Button onClick={() => setCloseOpen(true)}>Close</Button>}
          {!["CLOSED", "CANCELLED"].includes(c.status) && (
            <Button variant="ghost" onClick={() => setCancelOpen(true)} disabled={action.isPending}>Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Complaint No." value={c.complaintNo} />
              <Field label="Source" value={c.source} />
              <Field label="Severity" value={<Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>} />
              <Field label="Status" value={<ComplaintStatusBadge status={c.status} />} />
              <Field label="Reported By" value={c.reportedBy || "—"} />
              <Field label="Reported" value={formatDate(c.reportedDate)} />
              <Field label="Owner" value={ownerName} />
              <Field label="Closed" value={formatDate(c.closedDate)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Complaint</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body">{c.complaintDescription}</p></CardContent>
          </Card>

          {inv && (inv.investigationFindings || inv.rootCause || inv.impactOnProduct) && (
            <Card>
              <CardHeader><CardTitle>Investigation</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-body">
                {inv.investigationFindings && <Block label="Findings" value={inv.investigationFindings} />}
                {inv.rootCause && <Block label={`Root Cause${inv.rootCauseMethod ? ` (${inv.rootCauseMethod})` : ""}`} value={inv.rootCause} />}
                {inv.impactOnProduct && <Block label="Impact on Product" value={inv.impactOnProduct} />}
              </CardContent>
            </Card>
          )}

          {c.resolution?.resolutionDescription && (
            <Card>
              <CardHeader><CardTitle>Resolution</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-body">{c.resolution.resolutionDescription}</p>
                <p className="mt-1 text-label text-muted-foreground">Resolved {formatDate(c.resolution.resolutionDate)}</p>
              </CardContent>
            </Card>
          )}

          {c.linkedCapaIds.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Linked CAPAs</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {c.linkedCapaIds.map((cid) => <li key={cid}><Link href={`/capa/${cid}`} className="text-brand-secondary hover:underline">CAPA #{cid}</Link></li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent><AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} /></CardContent>
      </Card>

      {/* Signature ceremonies */}
      <SignatureModal open={ackOpen} onOpenChange={setAckOpen} title="Acknowledge Complaint" recordNumber={c.complaintNo} recordTitle={c.complaintDescription} recordNoun="complaint" statusNode={<ComplaintStatusBadge status={c.status} />} isPending={action.isPending} successMessage="Complaint acknowledged"
        onSign={async (creds) => { await action.mutateAsync({ path: "acknowledge", body: { expectedVersion: c.version, reason: creds.reason || "Acknowledged within SLA", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement } }); }} />
      <SignatureModal open={closeOpen} onOpenChange={setCloseOpen} title="Close Complaint" recordNumber={c.complaintNo} recordTitle={c.complaintDescription} recordNoun="complaint" statusNode={<ComplaintStatusBadge status={c.status} />} isPending={action.isPending} successMessage="Complaint closed"
        onSign={async (creds) => { await action.mutateAsync({ path: "close", body: { expectedVersion: c.version, reason: creds.reason || "Closed", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement } }); }} />
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

      {/* Structured sub-actions */}
      <ActionFormModal open={modal === "investigate"} onOpenChange={(o) => !o && setModal(null)} title="Investigate" isPending={action.isPending} successMessage="Investigation recorded"
        fields={[{ name: "investigationFindings", label: "Investigation findings", type: "textarea", required: true }, { name: "reason", label: "Reason", type: "text" }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "investigate", body: { expectedVersion: c.version, investigationFindings: v.investigationFindings, reason: v.reason || undefined } }); }} />
      <ActionFormModal open={modal === "rootcause"} onOpenChange={(o) => !o && setModal(null)} title="Record Root Cause" isPending={action.isPending} successMessage="Root cause recorded"
        fields={[{ name: "rootCause", label: "Root cause", type: "textarea", required: true }, { name: "rootCauseMethod", label: "Method", type: "select", options: [{ value: "5 Whys", label: "5 Whys" }, { value: "Fishbone", label: "Fishbone" }, { value: "FMEA", label: "FMEA" }] }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "root-cause-analysis", body: { rootCause: v.rootCause, rootCauseMethod: v.rootCauseMethod || undefined } }); }} />
      <ActionFormModal open={modal === "impact"} onOpenChange={(o) => !o && setModal(null)} title="Impact Assessment" isPending={action.isPending} successMessage="Impact recorded"
        fields={[{ name: "impactOnProduct", label: "Impact on product / patients", type: "textarea", required: true }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "impact-assessment", body: { impactOnProduct: v.impactOnProduct } }); }} />
      <ActionFormModal open={modal === "linkcapa"} onOpenChange={(o) => !o && setModal(null)} title="Link CAPA" description="Link an existing CAPA by its id." isPending={action.isPending} successMessage="CAPA linked"
        fields={[{ name: "capaId", label: "CAPA id", type: "number", required: true }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "link-capa", body: { capaId: Number(v.capaId) } }); }} />
      <ActionFormModal open={modal === "resolve"} onOpenChange={(o) => !o && setModal(null)} title="Resolve Complaint" isPending={action.isPending} successMessage="Complaint resolved"
        fields={[{ name: "resolutionDescription", label: "Resolution", type: "textarea", required: true }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "resolution", body: { expectedVersion: c.version, resolutionDescription: v.resolutionDescription } }); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-label text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>;
}
function Block({ label, value }: { label: string; value: string }) {
  return <div><p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 whitespace-pre-wrap">{value}</p></div>;
}
