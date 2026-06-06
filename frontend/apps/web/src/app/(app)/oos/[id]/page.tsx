"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useOos, useOosTrail, useOosAction } from "@/hooks/useOos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { OosStatusBadge } from "@/components/oos/OosStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { LIKELY_CAUSE_LABELS, type OosDisposition } from "@/types/oos";

type FormModal = null | "assessment" | "repeatResult" | "rca" | "capa";

export default function OosDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const oos = useOos(id);
  const trail = useOosTrail(id);
  const action = useOosAction(id);
  const [dispoOpen, setDispoOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [modal, setModal] = useState<FormModal>(null);
  const [disposition, setDisposition] = useState<OosDisposition>("ACCEPT");
  const [rationale, setRationale] = useState("");

  if (oos.isLoading) return <LoadingScreen label="Loading OOS case…" />;
  if (oos.isError || !oos.data) return <ErrorAlert title="Error" message="Failed to load this OOS case." />;
  const o = oos.data;

  function simple(path: string, reason: string) {
    action.mutate({ path, body: { expectedVersion: o.version, reason } }, { onSuccess: () => toast.success("Done") });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/oos" className="hover:underline">OOS</Link><span>/</span><span>{o.oosNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{o.oosNo}</h1>
          <div className="mt-1"><OosStatusBadge status={o.status} /></div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {o.status === "REPORTED" && <Button onClick={() => setModal("assessment")} disabled={action.isPending}>Initial Assessment</Button>}
          {o.status === "INITIAL_ASSESSMENT" && (
            <>
              <Button variant="outline" onClick={() => simple("repeat-testing", "Repeat testing ordered")} disabled={action.isPending}>Order Repeat Test</Button>
              <Button onClick={() => simple("begin-investigation", "Investigation started")} disabled={action.isPending}>Begin Investigation</Button>
            </>
          )}
          {o.status === "AWAITING_REPEAT" && (
            <>
              <Button variant="outline" onClick={() => setModal("repeatResult")} disabled={action.isPending}>Record Repeat Result</Button>
              <Button variant="outline" onClick={() => simple("begin-investigation", "Investigation started")} disabled={action.isPending}>Begin Investigation</Button>
              <Button onClick={() => setDispoOpen(true)}>Determine Disposition</Button>
            </>
          )}
          {o.status === "INVESTIGATING" && (
            <>
              <Button variant="outline" onClick={() => setModal("rca")} disabled={action.isPending}>Root Cause Analysis</Button>
              <Button onClick={() => setDispoOpen(true)}>Determine Disposition</Button>
            </>
          )}
          {o.status === "DISPOSITION_DETERMINED" && (
            <>
              <Button variant="outline" onClick={() => setModal("capa")} disabled={action.isPending}>Create CAPA</Button>
              <Button onClick={() => setCloseOpen(true)}>Close</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="OOS No." value={o.oosNo} />
              <Field label="Test Method" value={o.testMethod || "—"} />
              <Field label="Spec Range" value={`${o.specificationLimitMin ?? "—"} – ${o.specificationLimitMax ?? "—"}`} />
              <Field label="Reported Result" value={<span className="font-medium text-error">{o.reportedResult}</span>} />
              <Field label="Status" value={<OosStatusBadge status={o.status} />} />
              <Field label="Reported By" value={o.reportedByName || "—"} />
              <Field label="Reported" value={formatDate(o.reportedDate)} />
              <Field label="Closed" value={formatDate(o.closedDate)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {o.initialAssessment && (
            <Card>
              <CardHeader><CardTitle>Initial Assessment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-body">
                {o.initialAssessment.likelyCause && <Badge variant="info">{LIKELY_CAUSE_LABELS[o.initialAssessment.likelyCause as keyof typeof LIKELY_CAUSE_LABELS] ?? o.initialAssessment.likelyCause}</Badge>}
                <p className="whitespace-pre-wrap">{o.initialAssessment.assessmentFindings}</p>
              </CardContent>
            </Card>
          )}
          {o.repeatTesting && (o.repeatTesting.repeatResult || o.repeatTesting.repeatOrderedDate) && (
            <Card>
              <CardHeader><CardTitle>Repeat Testing</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-body">
                {o.repeatTesting.repeatResult && <Badge variant={o.repeatTesting.repeatResult === "PASS" ? "success" : "error"}>{o.repeatTesting.repeatResult}</Badge>}
                <p className="text-label text-muted-foreground">Ordered {formatDate(o.repeatTesting.repeatOrderedDate)} · Tested {formatDate(o.repeatTesting.repeatTestDate)} {o.repeatTesting.testTechnicianName ? `· ${o.repeatTesting.testTechnicianName}` : ""}</p>
                {o.repeatTesting.notes && <p>{o.repeatTesting.notes}</p>}
              </CardContent>
            </Card>
          )}
          {o.investigation && (o.investigation.investigationFindings || o.investigation.rootCause) && (
            <Card>
              <CardHeader><CardTitle>Investigation</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-body">
                {o.investigation.investigationFindings && <Block label="Findings" value={o.investigation.investigationFindings} />}
                {o.investigation.rootCause && <Block label={`Root Cause${o.investigation.rootCauseMethod ? ` (${o.investigation.rootCauseMethod})` : ""}`} value={o.investigation.rootCause} />}
              </CardContent>
            </Card>
          )}
          {o.disposition && (
            <Card>
              <CardHeader><CardTitle>Disposition</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-body">
                <Badge variant={o.disposition.disposition === "REJECT" ? "error" : o.disposition.disposition === "ACCEPT" ? "success" : "warning"}>{o.disposition.disposition}</Badge>
                <p className="whitespace-pre-wrap">{o.disposition.rationale}</p>
                <p className="text-label text-muted-foreground">Approved {formatDate(o.disposition.approvedDate)}</p>
              </CardContent>
            </Card>
          )}
          {o.linkedCapaIds.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Linked CAPAs</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">{o.linkedCapaIds.map((cid) => <li key={cid}><Link href={`/capa/${cid}`} className="text-brand-secondary hover:underline">CAPA #{cid}</Link></li>)}</ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent><AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} /></CardContent>
      </Card>

      {/* Determine disposition (signed + decision + rationale) */}
      <SignatureModal open={dispoOpen} onOpenChange={(open) => { if (!open) setRationale(""); setDispoOpen(open); }} title="Determine Disposition" recordNumber={o.oosNo} recordTitle={o.reportedResult} recordNoun="OOS case" statusNode={<OosStatusBadge status={o.status} />} isPending={action.isPending} successMessage="Disposition determined"
        onSign={async (creds) => { await action.mutateAsync({ path: "determine-disposition", body: { expectedVersion: o.version, disposition, rationale: rationale || "See investigation", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement, reason: creds.reason } }); }}>
        <div className="space-y-1.5"><Label htmlFor="dispo">Disposition</Label>
          <Select id="dispo" value={disposition} onChange={(e) => setDisposition(e.target.value as OosDisposition)}>
            <option value="ACCEPT">Accept</option><option value="REJECT">Reject</option><option value="INVESTIGATE">Investigate</option>
          </Select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="rationale">Rationale</Label>
          <Textarea id="rationale" rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Justification for the disposition" />
        </div>
      </SignatureModal>

      <SignatureModal open={closeOpen} onOpenChange={setCloseOpen} title="Close OOS Case" recordNumber={o.oosNo} recordTitle={o.reportedResult} recordNoun="OOS case" statusNode={<OosStatusBadge status={o.status} />} isPending={action.isPending} successMessage="OOS case closed"
        onSign={async (creds) => { await action.mutateAsync({ path: "close", body: { expectedVersion: o.version, reason: creds.reason || "Closed", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement } }); }} />

      {/* Structured sub-actions */}
      <ActionFormModal open={modal === "assessment"} onOpenChange={(o2) => !o2 && setModal(null)} title="Initial Assessment" isPending={action.isPending} successMessage="Assessment recorded"
        fields={[
          { name: "assessmentFindings", label: "Assessment findings", type: "textarea", required: true },
          { name: "likelyCause", label: "Likely cause", type: "select", options: [{ value: "TESTING_ERROR", label: "Testing Error" }, { value: "SAMPLE_HANDLING", label: "Sample Handling" }, { value: "PRODUCT_QUALITY", label: "Product Quality" }, { value: "METHOD_ISSUE", label: "Method Issue" }] },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "initial-assessment", body: { expectedVersion: o.version, assessmentFindings: v.assessmentFindings, likelyCause: v.likelyCause } }); }} />

      <ActionFormModal open={modal === "repeatResult"} onOpenChange={(o2) => !o2 && setModal(null)} title="Record Repeat Result" isPending={action.isPending} successMessage="Repeat result recorded"
        fields={[
          { name: "repeatResult", label: "Result", type: "select", options: [{ value: "PASS", label: "Pass" }, { value: "FAIL", label: "Fail" }] },
          { name: "testTechnicianName", label: "Technician", type: "text" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "repeat-result", body: { expectedVersion: o.version, repeatResult: v.repeatResult, testTechnicianName: v.testTechnicianName || undefined, notes: v.notes || undefined } }); }} />

      <ActionFormModal open={modal === "rca"} onOpenChange={(o2) => !o2 && setModal(null)} title="Root Cause Analysis" isPending={action.isPending} successMessage="Investigation recorded"
        fields={[
          { name: "investigationFindings", label: "Investigation findings", type: "textarea", required: true },
          { name: "rootCause", label: "Root cause", type: "textarea" },
          { name: "rootCauseMethod", label: "Method", type: "select", options: [{ value: "5 Whys", label: "5 Whys" }, { value: "Fishbone", label: "Fishbone" }, { value: "FMEA", label: "FMEA" }] },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "root-cause-analysis", body: { investigationFindings: v.investigationFindings, rootCause: v.rootCause || undefined, rootCauseMethod: v.rootCauseMethod || undefined } }); }} />

      <ActionFormModal open={modal === "capa"} onOpenChange={(o2) => !o2 && setModal(null)} title="Create CAPA from OOS" isPending={action.isPending} successMessage="CAPA created"
        fields={[{ name: "description", label: "CAPA description", type: "textarea", required: true }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "create-capa", body: { description: v.description, effectivenessCheckRequired: false } }); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-label text-muted-foreground">{label}</dt><dd className="text-right">{value}</dd></div>;
}
function Block({ label, value }: { label: string; value: string }) {
  return <div><p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 whitespace-pre-wrap">{value}</p></div>;
}
