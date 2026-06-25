"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useApproveChange,
  useChange,
  useChangeAction,
  useChangeAudit,
  type ChangeAction,
} from "@/hooks/useChangeControl";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { ChangeStatusBadge } from "@/components/change-control/ChangeStatusBadge";
import { ReasonModal } from "@/components/common/ReasonModal";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";

export default function ChangeDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const cc = useChange(id);
  const audit = useChangeAudit(id);
  const action = useChangeAction();
  const approve = useApproveChange();
  const users = useUsers();
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: ChangeAction; title: string; defaultReason: string }>(null);

  const ownerName = useMemo(() => {
    const by = cc.data?.createdBy;
    if (!by) return "Unassigned";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [cc.data, users.data]);

  if (cc.isLoading) return <LoadingScreen label="Loading change request..." />;
  if (cc.isError || !cc.data) return <ErrorAlert title="Error" message="Failed to load this change request." />;
  const c = cc.data;

  async function runAction(act: ChangeAction, reason: string) {
    try {
      await action.mutateAsync({ id, action: act, expectedVersion: c.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces 4xx/5xx */
    }
  }

  function requestReasonAction(act: ChangeAction, title: string, defaultReason: string) {
    setReasonAction({ action: act, title, defaultReason });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/change-control" className="hover:underline">Change Control</Link>
            <span>/</span>
            <span>{c.changeNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{c.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ChangeStatusBadge status={c.status} />
            <Badge variant={c.type === "MAJOR" ? "warning" : "neutral"}>{c.type === "MAJOR" ? "Major Change" : "Minor Change"}</Badge>
            {c.purposeOfChange ? <Badge variant="info">{c.purposeOfChange}</Badge> : null}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {c.status === "DRAFT" && (
            <>
              <Button onClick={() => runAction("submit-for-review", "Submitted for QA assessment")} disabled={action.isPending}>Submit for QA Assessment</Button>
              <Button variant="outline" onClick={() => requestReasonAction("cancel", "Cancel Change Request", "Cancelled")} disabled={action.isPending}>Cancel</Button>
            </>
          )}
          {c.status === "CHANGES_REQUESTED" && (
            <Button onClick={() => runAction("resubmit-for-review", "Resubmitted for QA assessment")} disabled={action.isPending}>Resubmit for QA Assessment</Button>
          )}
          {c.status === "UNDER_REVIEW" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("request-changes", "Request Changes", "Changes requested")} disabled={action.isPending}>Request Changes</Button>
              <Button onClick={() => runAction("submit-for-approval", "Submitted for approval")} disabled={action.isPending}>Submit for Approval</Button>
            </>
          )}
          {c.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("reject", "Reject Change Request", "Rejected")} disabled={action.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {c.status === "APPROVED" && <Button onClick={() => runAction("start-implementation", "Implementation started")} disabled={action.isPending}>Start Implementation</Button>}
          {c.status === "IN_IMPLEMENTATION" && <Button onClick={() => runAction("complete-implementation", "Implementation completed")} disabled={action.isPending}>Complete Implementation</Button>}
          {c.status === "IMPLEMENTED" && <Button onClick={() => runAction("submit-for-closure", "Submitted for closure")} disabled={action.isPending}>Submit for Closure</Button>}
          {c.status === "PENDING_CLOSURE" && <Button onClick={() => requestReasonAction("close", "Close Change Request", "Closed")} disabled={action.isPending}>Close</Button>}
        </div>
      </div>

      <Section title="Record Summary">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Change No." value={c.changeNumber} />
          <Field label="Record State" value={<ChangeStatusBadge status={c.status} />} />
          <Field label="Location" value={dash(c.locationName)} />
          <Field label="Created By" value={ownerName} />
          <Field label="Date of Initiation" value={formatDate(c.createdAt)} />
          <Field label="Change Owner" value={dash(c.changeOwner)} />
          <Field label="HOD of Change Owner" value={dash(c.changeOwnerHod)} />
          <Field label="QA Responsible" value={dash(c.qaResponsible)} />
        </div>
      </Section>

      <Section title="Change Control Initiation">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Field label="Purpose of Change" value={dash(c.purposeOfChange)} />
          <Field label="Change Category" value={dash(c.changeCategory)} />
          <Field label="Change Classification" value={c.type === "MAJOR" ? "Major Change" : "Minor Change"} />
          <Field label="Reg Mandate Effective Date" value={formatDate(c.regulatoryMandateEffectiveDate)} />
          <Field label="Source of Regulatory Mandate" value={dash(c.regulatoryMandateSource)} />
          <Field label="Related Market" value={dash(c.relatedMarket)} />
          <Field label="Related Customer" value={dash(c.relatedCustomer)} />
          <Field label="Type of Change" value={dash(c.changeNature)} />
          <Field label="Expected Completion" value={formatDate(c.targetImplementationDate)} />
          <Field label="Temporary Period / Events" value={dash(c.temporaryChangePeriod)} />
          <Field label="Effectiveness Check" value={c.effectivenessCheckRequired ? "Required" : "Not required"} />
          <Field label="Necessary Departments" value={c.involvedDepartments.length ? c.involvedDepartments.join(", ") : "-"} />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Section title="Product / Item Details" className="xl:col-span-1">
          <dl className="space-y-3">
            <Field label="Vendor Code" value={dash(c.vendorCode)} />
            <Field label="Vendor Name" value={dash(c.vendorName)} />
            <Field label="Product/Item Code" value={dash(c.productItemCode)} />
            <Field label="Product/Item Description" value={dash(c.productItemDescription)} />
          </dl>
        </Section>
        <Section title="Equipment Details" className="xl:col-span-1">
          <dl className="space-y-3">
            <Field label="Equipment ID Number" value={dash(c.equipmentIdNumber)} />
            <Field label="Equipment Name" value={dash(c.equipmentName)} />
          </dl>
        </Section>
        <Section title="Document Details" className="xl:col-span-1">
          <dl className="space-y-3">
            <Field label="Document Name" value={dash(c.documentName)} />
            <Field label="Document No." value={dash(c.documentNumber)} />
          </dl>
        </Section>
      </div>

      <Section title="Change Request">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Block label="Brief of Current Status" value={c.currentStatusBrief || c.description} />
          <Block label="Brief of Proposed Change" value={c.proposedChangeBrief} />
          <Block label="Justification or Rationale" value={c.justification} />
        </div>
      </Section>

      <Section title="Impact Assessment">
        {c.impactTasks.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-body">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Check Point</th>
                  <th className="px-3 py-2">Applicability</th>
                  <th className="px-3 py-2">Proposed Task</th>
                  <th className="px-3 py-2">Assignee</th>
                  <th className="px-3 py-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {c.impactTasks.map((task, index) => (
                  <tr key={`${task.checkpointNo ?? index}-${task.impactArea ?? ""}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{task.checkpointNo ?? index + 1}</td>
                    <td className="px-3 py-2">{dash(task.impactArea)}</td>
                    <td className="px-3 py-2">{dash(task.applicability)}</td>
                    <td className="px-3 py-2">{dash(task.proposedTask)}</td>
                    <td className="px-3 py-2">{dash(task.taskAssignee)}</td>
                    <td className="px-3 py-2">{dash(task.remarks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-body text-muted-foreground">No impact assessment checkpoints captured.</p>}
      </Section>

      <Section title="QA Assessment">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Field label="Requirement of RAD Assessment" value={dash(c.radAssessmentRequired)} />
          <Field label="Requirement of Customer/CG Assessment" value={dash(c.customerCgAssessmentRequired)} />
          <Field label="QA Assessment By" value={dash(c.qaAssessmentBy)} />
          <Field label="QA Assessment On" value={formatDate(c.qaAssessmentOn)} />
          <Field label="Internal Customer" value={dash(c.internalCustomer)} />
          <Field label="Change Acceptance" value={dash(c.changeAcceptance)} />
          <Block label="Customer/CG Comments" value={c.customerCgComments} />
          <Block label="Comment by QA" value={c.qaComment} />
          <Block label="Recommendations" value={c.recommendations} />
        </div>
      </Section>

      <Section title="QA Review and Authorization">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Block label="QP Comments" value={c.qpComments} />
          <Field label="Variation Classification" value={dash(c.variationClassification)} />
          <Field label="Documents Requested For Filing" value={dash(c.documentsRequestedForFiling)} />
          <Field label="Recommendation For Release" value={dash(c.recommendationForRelease)} />
          <Block label="Other Recommendations" value={c.otherRecommendations} />
          <Block label="Assessment by RAD" value={c.radAssessment} />
          <Block label="Review by Other Departments" value={c.otherDepartmentsReview} />
          <Field label="Final Decision by QA" value={dash(c.finalQaDecision)} />
          <Field label="Date of QA Review" value={formatDate(c.qaReviewDate)} />
          <Field label="QA Reviewer" value={dash(c.qaReviewer)} />
        </div>
      </Section>

      <Section title="Change Closure">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Block label="Implementation Details" value={c.implementationDetails} />
          <Block label="Change Implementation Review" value={c.implementationReview} />
          <Block label="Action Confirmation Comment" value={c.actionConfirmationComment} />
          <Field label="Change Effective Date" value={formatDate(c.changeEffectiveDate)} />
          <Field label="Closure Remarks" value={dash(c.closureRemarks)} />
          <Field label="Batch Number / AR Number" value={dash(c.batchArNumber)} />
          <Field label="Product/Material Code" value={dash(c.productMaterialCode)} />
          <Field label="Product Name / Material Name" value={dash(c.productMaterialName)} />
          <Field label="Closed By" value={dash(c.closedByName)} />
          <Field label="Date of Change Control Closure" value={formatDate(c.closedDate)} />
        </div>
      </Section>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent><AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} /></CardContent>
      </Card>

      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Change Request"
        recordNumber={c.changeNumber}
        recordTitle={c.title}
        recordNoun="change request"
        statusNode={<ChangeStatusBadge status={c.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({
            id,
            expectedVersion: c.version,
            password: creds.password,
            totpCode: creds.totpCode,
            reason: creds.reason,
            meaningStatement: creds.meaningStatement,
          });
        }}
      />
      <ReasonModal
        open={!!reasonAction}
        onOpenChange={(open) => !open && setReasonAction(null)}
        title={reasonAction?.title ?? "Workflow Action"}
        defaultReason={reasonAction?.defaultReason ?? ""}
        submitLabel="Confirm"
        isPending={action.isPending}
        onSubmit={async (reason) => {
          if (!reasonAction) return;
          await action.mutateAsync({ id, action: reasonAction.action, expectedVersion: c.version, reason });
        }}
      />
    </div>
  );
}

function Section({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <Card className={className}>
      <CardHeader className="border-b border-border bg-muted/40"><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-body font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Block({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="lg:col-span-1">
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-body">{dash(value)}</p>
    </div>
  );
}

function dash(value?: string | null) {
  return value && value.trim() ? value : "-";
}
