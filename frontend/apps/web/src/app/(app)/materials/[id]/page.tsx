"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useMaterial,
  useMaterialAudit,
  useMaterialTransition,
  useApproveMaterial,
  type MaterialAction,
} from "@/hooks/useMaterial";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { MaterialStatusBadge } from "@/components/materials/MaterialStatusBadge";
import { ReasonModal } from "@/components/common/ReasonModal";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { MATERIAL_TYPE_LABELS, UOM_LABELS } from "@/types/material";

export default function MaterialDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const material = useMaterial(id);
  const audit = useMaterialAudit(id);
  const transition = useMaterialTransition();
  const approve = useApproveMaterial();
  const users = useUsers();
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: MaterialAction; title: string; defaultReason: string }>(null);

  const ownerName = useMemo(() => {
    const by = material.data?.createdBy;
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [material.data, users.data]);

  if (material.isLoading) return <LoadingScreen label="Loading material…" />;
  if (material.isError || !material.data) return <ErrorAlert title="Error" message="Failed to load this material." />;
  const m = material.data;

  async function runAction(act: MaterialAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: m.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function requestReasonAction(act: MaterialAction, title: string, defaultReason: string) {
    setReasonAction({ action: act, title, defaultReason });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/materials" className="hover:underline">Material Management</Link>
            <span>/</span>
            <span>{m.materialCode}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{m.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <MaterialStatusBadge status={m.status} />
            <Badge variant="neutral">{MATERIAL_TYPE_LABELS[m.materialType]}</Badge>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {m.status === "DRAFT" && (
            <>
              <Button asChild variant="outline"><Link href={`/materials/${id}/edit`}>Edit</Link></Button>
              <Button onClick={() => runAction("submit-for-approval", "Submitted for approval")} disabled={transition.isPending}>Submit for Approval</Button>
            </>
          )}
          {m.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("reject", "Reject Material", "Rejected")} disabled={transition.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {m.status === "APPROVED" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("put-on-hold", "Put Material On Hold", "On hold")} disabled={transition.isPending}>Put On Hold</Button>
              <Button variant="outline" onClick={() => requestReasonAction("obsolete", "Obsolete Material", "Obsoleted")} disabled={transition.isPending}>Obsolete</Button>
            </>
          )}
          {m.status === "ON_HOLD" && (
            <>
              <Button onClick={() => runAction("release", "Released")} disabled={transition.isPending}>Release</Button>
              <Button variant="outline" onClick={() => requestReasonAction("obsolete", "Obsolete Material", "Obsoleted")} disabled={transition.isPending}>Obsolete</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Master Data</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="Code" value={m.materialCode} />
              <Field label="Name" value={m.name} />
              <Field label="Type" value={MATERIAL_TYPE_LABELS[m.materialType]} />
              <Field label="Unit of Measure" value={UOM_LABELS[m.unitOfMeasure]} />
              <Field label="Status" value={<MaterialStatusBadge status={m.status} />} />
              <Field label="Owner" value={ownerName} />
              <Field label="Created" value={formatDate(m.createdAt)} />
              <Field label="Last Modified" value={formatDate(m.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Specification</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body">{m.specification || "—"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body">{m.description || "—"}</p></CardContent>
          </Card>
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
        title="Approve Material"
        recordNumber={m.materialCode}
        recordTitle={m.name}
        recordNoun="material"
        statusNode={<MaterialStatusBadge status={m.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: m.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
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
          await transition.mutateAsync({ id, action: reasonAction.action, expectedVersion: m.version, reason });
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
