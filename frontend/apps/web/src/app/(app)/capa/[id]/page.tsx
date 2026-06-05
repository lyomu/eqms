"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Plus } from "lucide-react";
import {
  useCapa,
  useCapaActions,
  useCapaAudit,
  useCapaTransition,
  useUpdateCapaRootCause,
  useApproveCapa,
  useCloseCapa,
  useAddCapaAction,
  useCompleteCapaAction,
  type CapaAction,
} from "@/hooks/useCapa";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { CapaStatusBadge } from "@/components/capa/CapaStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { CAPA_SOURCE_LABELS, type CapaActionResponse, type CapaActionTypeKey } from "@/types/capa";

export default function CapaDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const capa = useCapa(id);
  const actions = useCapaActions(id);
  const audit = useCapaAudit(id);
  const transition = useCapaTransition();
  const approve = useApproveCapa();
  const close = useCloseCapa();
  const users = useUsers();

  const [approveOpen, setApproveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [effResult, setEffResult] = useState("");

  const ownerName = useMemo(() => {
    const by = capa.data?.createdBy;
    if (!by) return "—";
    return users.data?.find((u) => u.id === by)?.fullName ?? `User #${by}`;
  }, [capa.data, users.data]);

  if (capa.isLoading) return <LoadingScreen label="Loading CAPA…" />;
  if (capa.isError || !capa.data) return <ErrorAlert title="Error" message="Failed to load this CAPA." />;
  const c = capa.data;
  const editableRootCause = c.status === "DRAFT" || c.status === "UNDER_INVESTIGATION";
  const canManageActions = !["CLOSED", "REJECTED", "CANCELLED"].includes(c.status);

  async function runAction(act: CapaAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action: act, expectedVersion: c.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function promptAction(act: CapaAction, message: string, fallback: string) {
    const reason = window.prompt(message);
    if (reason === null) return;
    runAction(act, reason || fallback);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/capa" className="hover:underline">CAPA</Link>
            <span>/</span>
            <span>{c.capaNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{c.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <CapaStatusBadge status={c.status} />
            <Badge variant="neutral">{CAPA_SOURCE_LABELS[c.source]}</Badge>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {c.status === "DRAFT" && (
            <>
              <Button onClick={() => runAction("submit-for-investigation", "Submitted for investigation")} disabled={transition.isPending}>Submit for Investigation</Button>
              <Button variant="outline" onClick={() => promptAction("cancel", "Reason for cancelling:", "Cancelled")} disabled={transition.isPending}>Cancel</Button>
            </>
          )}
          {c.status === "UNDER_INVESTIGATION" && (
            <Button onClick={() => runAction("submit-for-approval", "Submitted for approval")} disabled={transition.isPending}>Submit for Approval</Button>
          )}
          {c.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => promptAction("reject", "Reason for rejection:", "Rejected")} disabled={transition.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {c.status === "APPROVED" && (
            <Button onClick={() => runAction("start-actions", "Actions started")} disabled={transition.isPending}>Start Actions</Button>
          )}
          {c.status === "IN_PROGRESS" && (
            <Button onClick={() => runAction("submit-for-effectiveness", "Submitted for effectiveness check")} disabled={transition.isPending}>Submit for Effectiveness</Button>
          )}
          {c.status === "PENDING_EFFECTIVENESS_CHECK" && (
            <Button onClick={() => setCloseOpen(true)}>Close</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3 text-body">
              <Field label="CAPA No." value={c.capaNumber} />
              <Field label="Source" value={CAPA_SOURCE_LABELS[c.source]} />
              <Field label="Status" value={<CapaStatusBadge status={c.status} />} />
              <Field label="Owner" value={ownerName} />
              <Field label="Effectiveness Check" value={c.effectivenessCheckRequired ? "Required" : "Not required"} />
              {c.effectivenessCheckResult && <Field label="Effectiveness Result" value={c.effectivenessCheckResult} />}
              <Field label="Due" value={formatDate(c.dueDate)} />
              <Field label="Closed" value={formatDate(c.closedDate)} />
              <Field label="Created" value={formatDate(c.createdAt)} />
              <Field label="Last Modified" value={formatDate(c.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Problem Description</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-body">{c.description || "—"}</p></CardContent>
          </Card>

          <RootCauseCard
            id={id}
            version={c.version}
            current={c.rootCause}
            editable={editableRootCause}
          />

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <CardTitle>Corrective &amp; Preventive Actions</CardTitle>
              {canManageActions && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Action
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ActionsList capaId={id} actions={actions.data} isLoading={actions.isLoading} isError={actions.isError} users={users.data} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />
        </CardContent>
      </Card>

      {/* Approve */}
      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve CAPA"
        recordNumber={c.capaNumber}
        recordTitle={c.title}
        recordNoun="CAPA"
        statusNode={<CapaStatusBadge status={c.status} />}
        isPending={approve.isPending}
        successMessage="Approved successfully"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: c.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
        }}
      />

      {/* Close (signature + effectiveness result) */}
      <SignatureModal
        open={closeOpen}
        onOpenChange={(o) => { if (!o) setEffResult(""); setCloseOpen(o); }}
        title="Close CAPA"
        recordNumber={c.capaNumber}
        recordTitle={c.title}
        recordNoun="CAPA"
        statusNode={<CapaStatusBadge status={c.status} />}
        isPending={close.isPending}
        successMessage="CAPA closed"
        onSign={async (creds) => {
          await close.mutateAsync({ id, expectedVersion: c.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement, effectivenessResult: effResult || undefined });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="eff-result">Effectiveness result</Label>
          <Textarea id="eff-result" rows={2} value={effResult} onChange={(e) => setEffResult(e.target.value)} placeholder="Outcome of the effectiveness check" />
        </div>
      </SignatureModal>

      <AddActionModal capaId={id} open={addOpen} onOpenChange={setAddOpen} users={users.data} />
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
  const update = useUpdateCapaRootCause();
  const [value, setValue] = useState(current ?? "");
  return (
    <Card>
      <CardHeader><CardTitle>Root Cause Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {editable ? (
          <>
            <Textarea rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Root cause statement / analysis" />
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

function ActionsList({ capaId, actions, isLoading, isError, users }: {
  capaId: number;
  actions: CapaActionResponse[] | undefined;
  isLoading: boolean;
  isError: boolean;
  users: { id: number; fullName: string }[] | undefined;
}) {
  const complete = useCompleteCapaAction();
  if (isLoading) return <p className="text-label text-muted-foreground">Loading actions…</p>;
  if (isError) return <ErrorAlert title="Error" message="Failed to load actions." />;
  if (!actions || actions.length === 0) return <p className="text-body text-muted-foreground">No actions yet.</p>;

  const nameOf = (uid: number | null) => (uid ? users?.find((u) => u.id === uid)?.fullName ?? `User #${uid}` : "—");

  return (
    <ul className="divide-y divide-border">
      {actions.map((a) => (
        <li key={a.id} className="flex items-center gap-3 py-2">
          <Badge variant={a.actionType === "CORRECTIVE" ? "info" : "neutral"}>
            {a.actionType === "CORRECTIVE" ? "CA" : "PA"}
          </Badge>
          <div className="min-w-0">
            <p className="truncate text-body">{a.description}</p>
            <p className="text-label text-muted-foreground">{nameOf(a.assignedTo)} · due {formatDate(a.dueDate)}</p>
          </div>
          <div className="ml-auto shrink-0">
            {a.completedDate ? (
              <span className="inline-flex items-center gap-1 text-label text-success">
                <CheckCircle2 className="h-4 w-4" /> {formatDate(a.completedDate)}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={complete.isPending}
                onClick={async () => {
                  try {
                    await complete.mutateAsync({ actionId: a.id, capaId });
                    toast.success("Action completed");
                  } catch { /* interceptor */ }
                }}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AddActionModal({ capaId, open, onOpenChange, users }: {
  capaId: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  users: { id: number; fullName: string }[] | undefined;
}) {
  const add = useAddCapaAction();
  const [actionType, setActionType] = useState<CapaActionTypeKey>("CORRECTIVE");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  function reset() {
    setActionType("CORRECTIVE");
    setDescription("");
    setAssignedTo("");
    setDueDate("");
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title="Add Action" description="Define a corrective or preventive action.">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="a-type">Type</Label>
          <Select id="a-type" value={actionType} onChange={(e) => setActionType(e.target.value as CapaActionTypeKey)}>
            <option value="CORRECTIVE">Corrective</option>
            <option value="PREVENTIVE">Preventive</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-desc">Description</Label>
          <Textarea id="a-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-assignee">Assignee</Label>
            <Select id="a-assignee" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {users?.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-due">Due date</Label>
            <Input id="a-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={add.isPending}>Cancel</Button>
        <Button
          disabled={add.isPending || description.trim().length === 0}
          onClick={async () => {
            try {
              await add.mutateAsync({
                id: capaId,
                actionType,
                description,
                assignedTo: assignedTo ? Number(assignedTo) : null,
                dueDate: dueDate ? `${dueDate}T00:00:00Z` : null,
              });
              toast.success("Action added");
              reset();
              onOpenChange(false);
            } catch { /* interceptor */ }
          }}
        >
          {add.isPending ? "Adding…" : "Add Action"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
