"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useChange,
  useChangeAudit,
  useChangeAction,
  useApproveChange,
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
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [cc.data, users.data]);

  if (cc.isLoading) return <LoadingScreen label="Loading change request…" />;
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
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/change-control" className="hover:underline">
              Change Control
            </Link>
            <span>/</span>
            <span>{c.changeNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{c.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <ChangeStatusBadge status={c.status} />
            <Badge variant={c.type === "MAJOR" ? "warning" : "neutral"}>{c.type}</Badge>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(c.status === "DRAFT" || c.status === "CHANGES_REQUESTED") && (
            <>
              <Button
                onClick={() => runAction("submit-for-review", "Submitted for review")}
                disabled={action.isPending}
              >
                {c.status === "DRAFT" ? "Submit for Review" : "Resubmit for Review"}
              </Button>
              <Button
                variant="outline"
                onClick={() => requestReasonAction("cancel", "Cancel Change Request", "Cancelled")}
                disabled={action.isPending}
              >
                Cancel
              </Button>
            </>
          )}
          {c.status === "UNDER_REVIEW" && (
            <Button
              onClick={() => runAction("submit-for-approval", "Submitted for approval")}
              disabled={action.isPending}
            >
              Submit for Approval
            </Button>
          )}
          {c.status === "PENDING_APPROVAL" && (
            <>
              <Button
                variant="outline"
                onClick={() => requestReasonAction("reject", "Reject Change Request", "Rejected")}
                disabled={action.isPending}
              >
                Reject
              </Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {c.status === "APPROVED" && (
            <Button onClick={() => runAction("start-implementation", "Implementation started")} disabled={action.isPending}>
              Start Implementation
            </Button>
          )}
          {c.status === "IN_IMPLEMENTATION" && (
            <Button onClick={() => runAction("complete-implementation", "Implementation completed")} disabled={action.isPending}>
              Complete Implementation
            </Button>
          )}
          {c.status === "IMPLEMENTED" && (
            <Button onClick={() => runAction("submit-for-closure", "Submitted for closure")} disabled={action.isPending}>
              Submit for Closure
            </Button>
          )}
          {c.status === "PENDING_CLOSURE" && (
            <Button onClick={() => requestReasonAction("close", "Close Change Request", "Closed")} disabled={action.isPending}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Metadata */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Change No." value={c.changeNumber} />
              <Field label="Type" value={c.type} />
              <Field label="Status" value={<ChangeStatusBadge status={c.status} />} />
              <Field label="Owner" value={ownerName} />
              <Field label="Effectiveness Check" value={c.effectivenessCheckRequired ? "Required" : "Not required"} />
              <Field label="Target Implementation" value={formatDate(c.targetImplementationDate)} />
              <Field label="Implemented" value={formatDate(c.implementedDate)} />
              <Field label="Closed" value={formatDate(c.closedDate)} />
              <Field label="Created" value={formatDate(c.createdAt)} />
              <Field label="Last Modified" value={formatDate(c.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        {/* Change request body */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Change Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-label uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-body">{c.description || "—"}</p>
            </div>
            <div>
              <p className="text-label uppercase tracking-wide text-muted-foreground">Justification</p>
              <p className="mt-1 whitespace-pre-wrap text-body">{c.justification || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit trail */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
        </CardContent>
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
