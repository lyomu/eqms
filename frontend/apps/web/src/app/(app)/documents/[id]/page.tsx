"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Eye, Paperclip, LogIn, LogOut, MessageSquare, FileEdit } from "lucide-react";
import {
  useDocument,
  useDocumentVersions,
  useDocumentAudit,
  useDocumentApprovals,
  useDocumentAttachments,
  useDocumentAction,
  useDocumentNotes,
  useDocumentChangeRequests,
  useAddNote,
  useAddChangeRequest,
  useDeleteNote,
  useCheckOut,
  useCheckIn,
  useUsers,
  useUploadAttachment,
  type DocumentAction,
} from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { ApprovalModal } from "@/components/documents/ApprovalModal";
import { FilePreview, type PreviewTarget } from "@/components/common/FilePreview";
import { ReasonModal } from "@/components/common/ReasonModal";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  DOCUMENT_TYPE_LABELS,
  type AttachmentResponse,
  type DocumentNote,
  type DocumentStatus,
} from "@/types/documents";

type TabKey = "versions" | "notes" | "change-requests" | "audit" | "approvals";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const doc = useDocument(id);
  const users = useUsers();
  const action = useDocumentAction();
  const checkOut = useCheckOut(id);
  const checkIn = useCheckIn(id);
  const [tab, setTab] = useState<TabKey>("versions");
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: DocumentAction; title: string; defaultReason: string }>(null);

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

  function requestReasonAction(act: DocumentAction, title: string, defaultReason: string) {
    setReasonAction({ action: act, title, defaultReason });
  }

  async function handleCheckOut() {
    try {
      await checkOut.mutateAsync();
      toast.success("Document checked out");
    } catch {
      toast.error("Could not check out document");
    }
  }

  async function handleCheckIn() {
    try {
      await checkIn.mutateAsync();
      toast.success("Document checked in");
    } catch {
      toast.error("Could not check in document");
    }
  }

  const isCheckedOut = !!d.checkedOutBy;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/documents" className="hover:underline">Document Control</Link>
            <span>/</span>
            <span>{d.documentNumber}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{d.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={d.status} />
            <span className="text-label text-muted-foreground">v{d.majorVersion}</span>
            {isCheckedOut && (
              <span className="rounded-sm bg-warning/15 px-2 py-0.5 text-label font-medium text-warning">
                Checked out
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Check out / check in */}
          {!isCheckedOut ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckOut}
              disabled={checkOut.isPending}
              title="Lock document for editing"
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Check Out
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckIn}
              disabled={checkIn.isPending}
              title="Release document lock"
            >
              <LogIn className="mr-1.5 h-4 w-4" /> Check In
            </Button>
          )}

          {/* Status-driven workflow actions */}
          {d.status === "DRAFT" && (
            <>
              <Button asChild variant="outline">
                <Link href={`/documents/${id}/edit`}>Edit</Link>
              </Button>
              <Button
                onClick={() => runAction("submit-for-review", "Submitted for review")}
                disabled={action.isPending}
              >
                Submit for Review
              </Button>
            </>
          )}
          {d.status === "CHANGES_REQUESTED" && (
            <>
              <Button asChild variant="outline">
                <Link href={`/documents/${id}/edit`}>Edit</Link>
              </Button>
              <Button
                onClick={() => runAction("submit-for-review", "Resubmitted for review")}
                disabled={action.isPending}
              >
                Resubmit for Review
              </Button>
            </>
          )}
          {d.status === "UNDER_REVIEW" && (
            <Button
              onClick={() => runAction("submit-for-approval", "Submitted for approval")}
              disabled={action.isPending}
            >
              Submit for Approval
            </Button>
          )}
          {d.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => requestReasonAction("reject", "Reject Document", "Returned for changes")} disabled={action.isPending}>
                Reject
              </Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {d.status === "APPROVED" && (
            <Button
              onClick={() => runAction("make-effective", "Made effective")}
              disabled={action.isPending}
            >
              Make Effective
            </Button>
          )}
          {d.status === "EFFECTIVE" && (
            <Button
              variant="outline"
              onClick={() => requestReasonAction("obsolete", "Obsolete Document", "Obsoleted")}
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
              {isCheckedOut && (
                <Field
                  label="Checked Out"
                  value={
                    <span className="text-warning">
                      {users.data?.find((u) => u.id === d.checkedOutBy)?.fullName ?? `User #${d.checkedOutBy}`}
                    </span>
                  }
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Content + attachments */}
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
              { key: "notes", label: "Notes" },
              { key: "change-requests", label: "Change Requests" },
              { key: "audit", label: "Audit Trail" },
              { key: "approvals", label: "Approvals" },
            ]}
          />
        </div>
        <CardContent className="pt-4">
          {tab === "versions" && <VersionsTab id={id} />}
          {tab === "notes" && <NotesTab id={id} />}
          {tab === "change-requests" && <ChangeRequestsTab id={id} />}
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
      <ReasonModal
        open={!!reasonAction}
        onOpenChange={(open) => !open && setReasonAction(null)}
        title={reasonAction?.title ?? "Workflow Action"}
        defaultReason={reasonAction?.defaultReason ?? ""}
        submitLabel="Confirm"
        isPending={action.isPending}
        onSubmit={async (reason) => {
          if (!reasonAction) return;
          await action.mutateAsync({ id, action: reasonAction.action, expectedVersion: d.version, reason });
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

function Attachments({ documentId }: { documentId: number }) {
  const q = useDocumentAttachments(documentId);
  const uploadMut = useUploadAttachment();
  const items = (q.data as AttachmentResponse[] | undefined) ?? [];
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (q.isLoading) return <LoadingSpinner label="Loading attachments…" />;
  return (
    <>
      {items.length === 0 ? (
        <p className="text-label text-muted-foreground">No attachments.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-body">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setPreview({ id: a.id, fileName: a.fileName, contentType: a.contentType })}
                className="truncate text-left text-brand-secondary hover:underline"
                title="Preview"
              >
                {a.fileName}
              </button>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreview({ id: a.id, fileName: a.fileName, contentType: a.contentType })}
                  className="inline-flex items-center gap-1 text-brand-secondary hover:underline"
                >
                  <Eye className="h-4 w-4" /> Preview
                </button>
                <a
                  href={`/api/attachments/${a.id}/download`}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploadMut.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="mr-1.5 h-4 w-4" />
          {uploadMut.isPending ? "Uploading…" : "Add Attachment"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await uploadMut.mutateAsync({ documentId, file });
              toast.success("Attachment uploaded");
            } catch {
              toast.error("Upload failed");
            }
            e.target.value = "";
          }}
        />
      </div>
      <FilePreview attachment={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function NotesTab({ id }: { id: number }) {
  const q = useDocumentNotes(id);
  const add = useAddNote(id);
  const del = useDeleteNote(id);
  const [text, setText] = useState("");

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await add.mutateAsync(trimmed);
      setText("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
  }

  if (q.isLoading) return <LoadingSpinner label="Loading notes…" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="flex-1"
        />
        <Button size="sm" disabled={add.isPending || !text.trim()} onClick={submit}>
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Add Note
        </Button>
      </div>

      {q.data?.length === 0 && (
        <p className="text-body text-muted-foreground">No notes yet.</p>
      )}
      <NoteList notes={q.data ?? []} onDelete={(noteId) => del.mutateAsync(noteId)} />
    </div>
  );
}

function ChangeRequestsTab({ id }: { id: number }) {
  const q = useDocumentChangeRequests(id);
  const add = useAddChangeRequest(id);
  const del = useDeleteNote(id);
  const [text, setText] = useState("");

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await add.mutateAsync(trimmed);
      setText("");
      toast.success("Change request submitted");
    } catch {
      toast.error("Failed to submit change request");
    }
  }

  if (q.isLoading) return <LoadingSpinner label="Loading change requests…" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          placeholder="Describe the change request…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="flex-1"
        />
        <div className="flex flex-col gap-2">
          <Button size="sm" disabled={add.isPending || !text.trim()} onClick={submit}>
            <FileEdit className="mr-1.5 h-4 w-4" />
            Submit
          </Button>
          <Button size="sm" variant="outline" onClick={() => setText("")}>
            Clear
          </Button>
        </div>
      </div>

      {q.data?.length === 0 && (
        <p className="text-body text-muted-foreground">No change requests yet.</p>
      )}
      <NoteList notes={q.data ?? []} onDelete={(noteId) => del.mutateAsync(noteId)} />
    </div>
  );
}

function NoteList({
  notes,
  onDelete,
}: {
  notes: DocumentNote[];
  onDelete: (noteId: number) => void;
}) {
  if (notes.length === 0) return null;
  return (
    <ul className="divide-y divide-border">
      {notes.map((n) => (
        <li key={n.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-body whitespace-pre-wrap">{n.content}</p>
              <p className="mt-1 text-label text-muted-foreground">
                {n.createdByName ?? "—"} · {formatDateTime(n.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(n.id)}
              className="shrink-0 text-label text-muted-foreground hover:text-error"
            >
              Delete
            </button>
          </div>
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
