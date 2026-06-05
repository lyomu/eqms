"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useDeviation,
  useDeviationAudit,
  useDeviationTransition,
  useUpdateDeviationRootCause,
  useApproveDeviation,
  type DeviationAction,
} from "@/hooks/useDeviation";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { DeviationStatusBadge } from "@/components/deviations/DeviationStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { SEVERITY_VARIANT } from "@/types/deviation";

export default function DeviationDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const dev = useDeviation(id);
  const audit = useDeviationAudit(id);
  const transition = useDeviationTransition();
  const approve = useApproveDeviation();
  const users = useUsers();
  const [approveOpen, setApproveOpen] = useState(false);

  const ownerName = useMemo(() => {
    const by = dev.data?.createdBy;
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [dev.data, users.data]);

  if (dev.isLoading) return <LoadingScreen label="Loading deviation…" />;
  if (dev.isError || !dev.data) return <ErrorAlert title="Error" message="Failed to load this deviation." />;
  const d = dev.data;
  const editableRootCause = d.status === "DRAFT" || d.status === "UNDER_INVESTIGATION";

  async function runAction(act: DeviationAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: d.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function promptAction(act: DeviationAction, message: string, fallback: string) {
    const reason = window.prompt(message);
    if (reason === null) return;
    runAction(act, reason || fallback);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/deviations" className="hover:underline">Deviations</Link>
            <span>/</span>
            <span>{d.deviationNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{d.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <DeviationStatusBadge status={d.status} />
            <Badge variant={SEVERITY_VARIANT[d.severity]}>{d.severity}</Badge>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {d.status === "DRAFT" && (
            <>
              <Button onClick={() => runAction("submit-for-investigation", "Submitted for investigation")} disabled={transition.isPending}>Submit for Investigation</Button>
              <Button variant="outline" onClick={() => promptAction("cancel", "Reason for cancelling:", "Cancelled")} disabled={transition.isPending}>Cancel</Button>
            </>
          )}
          {d.status === "UNDER_INVESTIGATION" && (
            <Button onClick={() => runAction("submit-for-approval", "Submitted for approval")} disabled={transition.isPending}>Submit for Approval</Button>
          )}
          {d.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => promptAction("reject", "Reason for rejection:", "Rejected")} disabled={transition.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {d.status === "APPROVED" && (
            <Button onClick={() => promptAction("close", "Closure summary:", "Closed")} disabled={transition.isPending}>Close</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Dev No." value={d.deviationNumber} />
              <Field label="Severity" value={<Badge variant={SEVERITY_VARIANT[d.severity]}>{d.severity}</Badge>} />
              <Field label="Status" value={<DeviationStatusBadge status={d.status} />} />
              <Field label="Owner" value={ownerName} />
              <Field label="Occurred" value={formatDate(d.occurredDate)} />
              <Field label="Closed" value={formatDate(d.closedDate)} />
              <Field label="Created" value={formatDate(d.createdAt)} />
              <Field label="Last Modified" value={formatDate(d.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-label uppercase tracking-wide text-muted-foreground">What happened</p>
                <p className="mt-1 whitespace-pre-wrap text-body">{d.description || "—"}</p>
              </div>
              <div>
                <p className="text-label uppercase tracking-wide text-muted-foreground">Immediate action</p>
                <p className="mt-1 whitespace-pre-wrap text-body">{d.immediateAction || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <RootCauseCard id={id} version={d.version} current={d.rootCause} editable={editableRootCause} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
        </CardContent>
      </Card>

      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Deviation"
        recordNumber={d.deviationNumber}
        recordTitle={d.title}
        recordNoun="deviation"
        statusNode={<DeviationStatusBadge status={d.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: d.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
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

function RootCauseCard({ id, version, current, editable }: { id: number; version: number; current: string | null; editable: boolean }) {
  const update = useUpdateDeviationRootCause();
  const [value, setValue] = useState(current ?? "");
  return (
    <Card>
      <CardHeader><CardTitle>Root Cause</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {editable ? (
          <>
            <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Root cause statement" />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={update.isPending || value.trim().length === 0}
                onClick={async () => {
                  try {
                    await update.mutateAsync({ id, expectedVersion: version, rootCause: value, reason: "Root cause updated" });
                    toast.success("Root cause saved");
                  } catch { /* interceptor */ }
                }}
              >
                {update.isPending ? "Saving…" : "Save Root Cause"}
              </Button>
            </div>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-body">{current || "—"}</p>
        )}
      </CardContent>
    </Card>
  );
}
