"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Paperclip } from "lucide-react";
import {
  useDocument,
  useDocumentVersions,
  useDocumentAudit,
  useDocumentApprovals,
  useDocumentAttachments,
  useDocumentAction,
  useUsers,
  type DocumentAction,
} from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { ApprovalModal } from "@/components/documents/ApprovalModal";
import { formatDate, formatDateTime } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, type AttachmentResponse, type DocumentStatus } from "@/types/documents";

type TabKey = "versions" | "audit" | "approvals";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const doc = useDocument(id);
  const users = useUsers();
  const action = useDocumentAction();
  const [tab, setTab] = useState<TabKey>("versions");
  const [approveOpen, setApproveOpen] = useState(false);

  const ownerName = useMemo(() => {
    const cb = doc.data?.createdBy;
    if (!cb) return "—";
    return users.data?.find((u) => u.id === cb)?.fullName ?? `User #${cb}`;
  }, [doc.data, users.data]);

  if (doc.isLoading) return <LoadingScreen label="Loading document…" />;
  if (doc.isError || !doc.data) {
    return <ErrorAlert title="Error" message="Failed to load this document." />;
  }
  const d = doc.data;

  async function runAction(act: DocumentAction, reason: string) {
    try {
      await action.mutateAsync({ id, action: act, expectedVersion: d.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces 4xx/5xx as a toast */
    }
  }

  function onReject() {
    const reason = window.prompt("Reason for rejection / changes requested:");
    if (reason === null) return;
    runAction("reject", reason || "Returned for changes");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/documents" className="hover:underline">
              Document Control
            </Link>
            <span>/</span>
            <span>{d.documentNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{d.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={d.status} />
            <span className="text-label text-muted-foreground">v{d.majorVersion}</span>
          </div>
        </div>

        {/* Status-driven actions */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {d.status === "DRAFT" && (
            <>
              <Button asChild variant="outline">
                <Link href={`/documents/${id}/edit`}>Edit</Link>
              </Button>
              <Button onClick={() => runAction("submit-for-review", "Submitted for review")} disabled={action.isPending}>
                Submit for Review
              </Button>
            </>
          )}
          {d.status === "CHANGES_REQUESTED" && (
            <>
              <Button asChild variant="outline">
                <Link href={`/documents/${id}/edit`}>Edit</Link>
              </Button>
              <Button onClick={() => runAction("submit-for-review", "Resubmitted for review")} disabled={action.isPending}>
                Resubmit for Review
              </Button>
            </>
          )}
          {d.status === "UNDER_REVIEW" && (
            <Button onClick={() => runAction("submit-for-approval", "Submitted for approval")} disabled={action.isPending}>
              Submit for Approval
            </Button>
          )}
          {d.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={onReject} disabled={action.isPending}>
                Reject
              </Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {d.status === "APPROVED" && (
            <Button onClick={() => runAction("make-effective", "Made effective")} disabled={action.isPending}>
              Make Effective
            </Button>
          )}
          {d.status === "EFFECTIVE" && (
            <Button
              variant="outline"
              onClick={() => {
                const reason = window.prompt("Reason for obsoleting this document:");
                if (reason === null) return;
                runAction("obsolete", reason || "Obsoleted");
              }}
              disabled={action.isPending}
            >
              Obsolete
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
              <Field label="Doc Number" value={d.documentNumber} />
              <Field label="Type" value={DOCUMENT_TYPE_LABELS[d.type]} />
              <Field label="Status" value={<StatusBadge status={d.status} />} />
              <Field label="Owner" value={ownerName} />
              <Field label="Current Version" value={`v${d.majorVersion}`} />
              <Field label="Effective Date" value={formatDate(d.effectiveDate)} />
              <Field label="Next Review" value={formatDate(d.nextReviewDate)} />
              <Field label="Created" value={formatDate(d.createdAt)} />
              <Field label="Last Modified" value={formatDate(d.updatedAt)} />
            </dl>
          </CardContent>
        </Card>

        {/* Content preview + attachments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 font-sans text-body">
              {d.content || "No content."}
            </pre>
            <Attachments documentId={id} />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <div className="px-4 pt-2">
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
            tabs={[
              { key: "versions", label: "Versions" },
              { key: "audit", label: "Audit Trail" },
              { key: "approvals", label: "Approvals" },
            ]}
          />
        </div>
        <CardContent className="pt-4">
          {tab === "versions" && <VersionsTab id={id} />}
          {tab === "audit" && <AuditTab id={id} />}
          {tab === "approvals" && <ApprovalsTab id={id} />}
        </CardContent>
      </Card>

      <ApprovalModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        document={d}
        onApproved={() => doc.refetch()}
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

function Attachments({ documentId }: { documentId: number }) {
  const q = useDocumentAttachments(documentId);
  const items = (q.data as AttachmentResponse[] | undefined) ?? [];
  if (q.isLoading) return <LoadingSpinner label="Loading attachments…" />;
  if (items.length === 0) return <p className="text-label text-muted-foreground">No attachments.</p>;
  return (
    <ul className="space-y-1">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-2 text-body">
          <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{a.fileName}</span>
          <a
            href={`/api/attachments/${a.id}/download`}
            className="ml-auto inline-flex items-center gap-1 text-brand-secondary hover:underline"
          >
            <Download className="h-4 w-4" /> Download
          </a>
        </li>
      ))}
    </ul>
  );
}

function VersionsTab({ id }: { id: number }) {
  const q = useDocumentVersions(id);
  if (q.isLoading) return <LoadingSpinner label="Loading versions…" />;
  if (q.isError) return <ErrorAlert title="Error" message="Failed to load versions." />;
  if (!q.data || q.data.length === 0)
    return <p className="text-body text-muted-foreground">No versions recorded.</p>;
  return (
    <ul className="divide-y divide-border">
      {q.data.map((v) => (
        <li key={v.id} className="flex items-center gap-3 py-2">
          <span className="font-medium">v{v.versionLabel}</span>
          <StatusBadge status={v.status as DocumentStatus} />
          <span className="truncate text-label text-muted-foreground">{v.changeNotes}</span>
          <span className="ml-auto shrink-0 text-label text-muted-foreground">
            {v.createdByName ?? "—"} · {formatDateTime(v.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AuditTab({ id }: { id: number }) {
  const q = useDocumentAudit(id);
  if (q.isLoading) return <LoadingSpinner label="Loading audit trail…" />;
  if (q.isError)
    return (
      <ErrorAlert
        title="Audit trail unavailable"
        message="You may not have permission to view the audit trail (AUDIT_VIEW required)."
      />
    );
  if (!q.data || q.data.length === 0)
    return <p className="text-body text-muted-foreground">No audit entries.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
            <th className="py-2 pr-4">When (UTC)</th>
            <th className="py-2 pr-4">Who</th>
            <th className="py-2 pr-4">Action</th>
            <th className="py-2 pr-4">Field</th>
            <th className="py-2 pr-4">Old → New</th>
            <th className="py-2">Reason</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((e) => (
            <tr key={e.id} className="border-b border-border last:border-0 align-top">
              <td className="py-2 pr-4 whitespace-nowrap text-label">{formatDateTime(e.utcTimestamp)}</td>
              <td className="py-2 pr-4">{e.userFullName ?? `User #${e.userId}`}</td>
              <td className="py-2 pr-4">{e.action}</td>
              <td className="py-2 pr-4">{e.fieldName ?? "—"}</td>
              <td className="py-2 pr-4 text-label">
                {e.fieldName ? `${e.oldValue ?? "∅"} → ${e.newValue ?? "∅"}` : (e.newValue ?? "—")}
              </td>
              <td className="py-2">{e.reasonForChange ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsTab({ id }: { id: number }) {
  const q = useDocumentApprovals(id);
  if (q.isLoading) return <LoadingSpinner label="Loading approvals…" />;
  if (q.isError) return <ErrorAlert title="Error" message="Failed to load approvals." />;
  if (!q.data || q.data.length === 0)
    return <p className="text-body text-muted-foreground">No signatures applied yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {q.data.map((s) => (
        <li key={s.id} className="py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{s.signerFullName}</span>
            <span className="rounded-sm bg-success/15 px-2 py-0.5 text-label font-medium text-success">
              {s.meaning}
            </span>
            <span className="ml-auto text-label text-muted-foreground">{formatDateTime(s.signedAt)}</span>
          </div>
          <p className="mt-1 text-label text-muted-foreground">{s.meaningStatement}</p>
        </li>
      ))}
    </ul>
  );
}
