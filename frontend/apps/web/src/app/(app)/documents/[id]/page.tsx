"use client";

import { useRef, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  FilePen,
  Hourglass,
  Paperclip,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
import {
  useDocument,
  useDocumentVersions,
  useDocumentAudit,
  useDocumentApprovals,
  useDocumentAttachments,
  useDocumentAction,
  useDocumentNotes,
  useDocumentChangeRequests,
  useDocumentFolders,
  useDocumentApprovalProfiles,
  useDocumentList,
  useAddNote,
  useAddChangeRequest,
  useDeleteNote,
  useCheckOut,
  useCheckIn,
  useUsers,
  useUploadAttachment,
  type DocumentAction,
} from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen, LoadingSpinner } from "@/components/ui/loading-spinner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { ApprovalModal } from "@/components/documents/ApprovalModal";
import { FilePreview, type PreviewTarget } from "@/components/common/FilePreview";
import { ReasonModal } from "@/components/common/ReasonModal";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_TYPE_LABELS,
  type AttachmentResponse,
  type DocumentNote,
  type DocumentResponse,
  type DocumentVersion,
} from "@/types/documents";

type PanelKey = "notes" | "change-request" | "checkout" | "history";
type HistorySubTab = "history" | "archive";

const OPTIONS_ITEMS = ["Copy", "Move", "Add to Favorites", "Retain", "Email"] as const;

export default function DocumentDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const doc = useDocument(id);
  const users = useUsers();
  const folders = useDocumentFolders();
  const approvalProfiles = useDocumentApprovalProfiles();
  const relatedDocuments = useDocumentList({ page: 0, size: 100, sort: "documentNumber,asc" });
  const notes = useDocumentNotes(id);
  const action = useDocumentAction();
  const checkOut = useCheckOut(id);
  const checkIn = useCheckIn(id);

  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<null | { action: DocumentAction; title: string; defaultReason: string }>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const ownerName = useMemo(() => {
    const cb = doc.data?.ownerId ?? doc.data?.createdBy;
    if (!cb) return "—";
    return users.data?.find((u) => u.id === cb)?.fullName ?? `User #${cb}`;
  }, [doc.data, users.data]);

  const approvalProfileName = useMemo(() => {
    if (!doc.data?.approvalProfileId) return "—";
    return approvalProfiles.data?.find((profile) => profile.id === doc.data?.approvalProfileId)?.name
      ?? `Approval profile #${doc.data.approvalProfileId}`;
  }, [approvalProfiles.data, doc.data]);

  const referenceNames = useMemo(() => {
    const ids = new Set(doc.data?.referenceDocumentIds ?? []);
    return (relatedDocuments.data?.content ?? [])
      .filter((document) => ids.has(document.id))
      .map((document) => `${document.documentNumber} — ${document.title}`);
  }, [doc.data?.referenceDocumentIds, relatedDocuments.data?.content]);

  const folderName = useMemo(() => {
    if (!doc.data?.folderId || !folders.data) return null;
    function find(items: NonNullable<typeof folders.data>, targetId: number): string | null {
      for (const f of items) {
        if (f.id === targetId) return f.name;
        const hit = find(f.children ?? [], targetId);
        if (hit) return hit;
      }
      return null;
    }
    return find(folders.data, doc.data.folderId);
  }, [doc.data, folders.data]);

  if (doc.isLoading) return <LoadingScreen label="Loading document…" />;
  if (doc.isError || !doc.data) return <ErrorAlert title="Error" message="Failed to load this document." />;

  const d = doc.data;
  const isCheckedOut = !!d.checkedOutBy;
  const checkedOutByName = isCheckedOut
    ? (users.data?.find((u) => u.id === d.checkedOutBy)?.fullName ?? `User #${d.checkedOutBy}`)
    : null;
  const noteCount = notes.data?.length ?? 0;

  async function runAction(act: DocumentAction, reason: string) {
    try {
      await action.mutateAsync({ id, action: act, expectedVersion: d.version, reason });
      toast.success("Done");
    } catch {
      /* interceptor surfaces errors */
    }
  }

  function requestReasonAction(act: DocumentAction, title: string, defaultReason: string) {
    setReasonAction({ action: act, title, defaultReason });
  }

  function togglePanel(key: PanelKey) {
    setActivePanel((prev) => (prev === key ? null : key));
  }

  return (
    <div className="space-y-0">
      {/* ── Top navigation bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Status-driven workflow actions */}
          {(d.status === "DRAFT" || d.status === "CHANGES_REQUESTED") && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/documents/${id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          {d.status === "DRAFT" && (
            <Button size="sm" disabled={action.isPending} onClick={() => runAction("submit-for-review", "Submitted for review")}>
              Submit for Review
            </Button>
          )}
          {d.status === "CHANGES_REQUESTED" && (
            <Button size="sm" disabled={action.isPending} onClick={() => runAction("submit-for-review", "Resubmitted for review")}>
              Resubmit for Review
            </Button>
          )}
          {d.status === "UNDER_REVIEW" && (
            <Button size="sm" disabled={action.isPending} onClick={() => runAction("submit-for-approval", "Submitted for approval")}>
              Submit for Approval
            </Button>
          )}
          {d.status === "PENDING_APPROVAL" && (
            <>
              <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => requestReasonAction("reject", "Reject Document", "Returned for changes")}>
                Reject
              </Button>
              <Button size="sm" onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {d.status === "APPROVED" && (
            <Button size="sm" disabled={action.isPending} onClick={() => runAction("make-effective", "Made effective")}>
              Make Effective
            </Button>
          )}
          {d.status === "EFFECTIVE" && (
            <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => requestReasonAction("obsolete", "Obsolete Document", "Obsoleted")}>
              Obsolete
            </Button>
          )}

          {/* Options dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1"
              onClick={() => setOptionsOpen((o) => !o)}
            >
              Options <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {optionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOptionsOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-border bg-background shadow-lg">
                  {OPTIONS_ITEMS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="w-full px-4 py-2.5 text-left text-body hover:bg-muted"
                      onClick={() => { setOptionsOpen(false); toast.info(`${label} — coming soon`); }}
                    >
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-border" />
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-body text-error hover:bg-muted"
                    onClick={() => { setOptionsOpen(false); requestReasonAction("obsolete", "Archive Document", "Archived by user"); }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-background px-4 py-4">
        <h1 className="text-h1 text-brand-primary">
          {d.title}{" "}
          <span className="text-h3 font-normal text-muted-foreground">[v{d.majorVersion}.{String(d.minorVersion ?? 0).padStart(2, "0")}]</span>
        </h1>
      </div>

      {/* ── Metadata fields ─────────────────────────────────────── */}
      <div className="border-b border-border bg-background px-4 pb-4 pt-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ReadOnlyBox label="Format" value={DOCUMENT_TYPE_LABELS[d.type]} />
          <ReadOnlyBox label="Owner" value={ownerName} />
          <ReadOnlyBox label="Approval Type" value={approvalProfileName} />
          <ReadOnlyBox label="Created On" value={formatDateTime(d.createdAt).replace(" UTC", "")} />
          <ReadOnlyBox label="Folder" value={folderName ?? "—"} />
          <ReadOnlyBox label="Version" value={`v${d.majorVersion}.${String(d.minorVersion ?? 0).padStart(2, "0")}`} />
          <ReadOnlyBox
            label="Status"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={d.status} />
                {isCheckedOut && (
                  <span className="rounded-sm bg-warning/15 px-2 py-0.5 text-label font-medium text-warning">
                    Checked out
                  </span>
                )}
              </span>
            }
          />
          {d.effectiveDate && (
            <ReadOnlyBox label="Effective Date" value={formatDate(d.effectiveDate)} />
          )}
          {d.nextReviewDate && (
            <ReadOnlyBox label="Next Review" value={formatDate(d.nextReviewDate)} />
          )}
          <ReadOnlyBox label="PDF Rendition" value={d.pdfRenditionRequired === false ? "Not required" : "Required"} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ReadOnlyBox label="Keywords" value={d.keywords || "—"} />
          <ReadOnlyBox
            label="Reference URL"
            value={d.referenceUrl ? <a href={d.referenceUrl} target="_blank" rel="noreferrer" className="text-brand-secondary hover:underline">{d.referenceUrl}</a> : "—"}
          />
          <ReadOnlyBox label="Reference Documents" value={referenceNames.length ? referenceNames.join("; ") : "—"} />
        </div>
      </div>

      {/* ── 4 Section tiles ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border lg:grid-cols-4">
        <SectionTile
          icon={<ClipboardList className="h-10 w-10" />}
          label="Notes"
          active={activePanel === "notes"}
          count={noteCount}
          onClick={() => togglePanel("notes")}
        />
        <SectionTile
          icon={<ArrowUpDown className="h-10 w-10" />}
          label="Change Request/Approval"
          active={activePanel === "change-request"}
          onClick={() => togglePanel("change-request")}
        />
        <SectionTile
          icon={<FilePen className="h-10 w-10" />}
          label="Check Out/Check In"
          active={activePanel === "checkout"}
          onClick={() => togglePanel("checkout")}
        />
        <SectionTile
          icon={<Hourglass className="h-10 w-10" />}
          label="History/Archive"
          active={activePanel === "history"}
          onClick={() => togglePanel("history")}
        />
      </div>

      {/* ── Active panel content ─────────────────────────────────── */}
      {activePanel === "notes" && <NotesPanel id={id} />}
      {activePanel === "change-request" && (
        <ChangeRequestPanel
          id={id}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === "checkout" && (
        <CheckoutPanel
          id={id}
          isCheckedOut={isCheckedOut}
          checkedOutByName={checkedOutByName}
          checkedOutAt={d.checkedOutAt}
          onCheckOut={async () => {
            try { await checkOut.mutateAsync(); toast.success("Document checked out"); }
            catch { toast.error("Could not check out document"); }
          }}
          onCheckIn={async () => {
            try { await checkIn.mutateAsync(); toast.success("Document checked in"); }
            catch { toast.error("Could not check in document"); }
          }}
          checkingOut={checkOut.isPending}
          checkingIn={checkIn.isPending}
        />
      )}
      {activePanel === "history" && (
        <HistoryPanel
          document={d}
          ownerName={ownerName}
          folderName={folderName}
          id={id}
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────── */}
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
          await runAction(reasonAction.action, reason);
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shared primitives
───────────────────────────────────────────────────────────── */

function ReadOnlyBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-label font-medium text-muted-foreground">{label}:</p>
      <div className="min-h-10 rounded border border-border bg-muted/10 px-3 py-2 text-body">
        {value || "—"}
      </div>
    </div>
  );
}

function SectionTile({
  icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-28 flex-col justify-between p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-warning/15" : "bg-background hover:bg-muted/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center gap-1 text-label font-medium", active ? "text-error" : "text-success")}>
          <Eye className="h-3.5 w-3.5" />
          View
        </span>
        {count !== undefined && (
          <span className="flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-label">
            <ClipboardList className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{count}</span>
          </span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <span className={cn("transition-colors", active ? "text-warning" : "text-muted-foreground/50")}>
          {icon}
        </span>
        <span className={cn("text-body", active ? "font-bold text-foreground" : "font-semibold text-muted-foreground")}>
          {label}
        </span>
      </div>
    </button>
  );
}

function PanelButtons({
  pending,
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
      {onClose && (
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Notes panel
───────────────────────────────────────────────────────────── */

function NotesPanel({ id }: { id: number }) {
  const notes = useDocumentNotes(id);
  const add = useAddNote(id);
  const del = useDeleteNote(id);
  const [text, setText] = useState("");

  async function submit() {
    const content = text.trim();
    if (!content) return;
    try {
      await add.mutateAsync(content);
      setText("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    }
  }

  return (
    <div className="space-y-4 bg-warning/10 p-4">
      <div className="space-y-2">
        <Label>Details:</Label>
        <RichTextEditor value={text} minHeight={160} onChange={setText} />
      </div>
      <PanelButtons
        pending={add.isPending}
        onSubmit={submit}
        onClear={() => setText("")}
      />

      {notes.isLoading && <LoadingSpinner label="Loading notes…" />}
      {notes.data && notes.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-label font-semibold text-muted-foreground">Existing notes:</p>
          <NoteList notes={notes.data} onDelete={(noteId) => del.mutateAsync(noteId)} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Change Request / Approval panel
───────────────────────────────────────────────────────────── */

function ChangeRequestPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const requests = useDocumentChangeRequests(id);
  const add = useAddChangeRequest(id);
  const del = useDeleteNote(id);
  const uploadMut = useUploadAttachment();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const attachments = useDocumentAttachments(id);

  async function submit() {
    const content = text.trim();
    if (!content) return;
    try {
      await add.mutateAsync(content);
      setText("");
      toast.success("Change request submitted");
    } catch {
      toast.error("Failed to submit change request");
    }
  }

  return (
    <div className="space-y-4 bg-warning/10 p-4">
      <PanelButtons
        pending={add.isPending}
        onSubmit={submit}
        onClear={() => setText("")}
        onClose={onClose}
      />

      <div className="space-y-2">
        <Label>
          Details: <span className="text-error">*</span>
        </Label>
        <RichTextEditor value={text} minHeight={180} onChange={setText} />
      </div>

      <div className="space-y-2">
        <Label>Attachment</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadMut.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="mr-1.5 h-4 w-4" />
            {uploadMut.isPending ? "Uploading…" : "Choose File"}
          </Button>
          <span className="text-label text-muted-foreground">
            {uploadMut.isPending ? "Uploading…" : "No file chosen"}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await uploadMut.mutateAsync({ documentId: id, file });
              toast.success("Attachment uploaded");
            } catch {
              toast.error("Upload failed");
            }
            e.target.value = "";
          }}
        />
      </div>

      {/* Attachment list */}
      {attachments.data && (attachments.data as AttachmentResponse[]).length > 0 && (
        <div className="space-y-1">
          <p className="text-label font-semibold text-muted-foreground">Attachments:</p>
          <ul className="space-y-1">
            {(attachments.data as AttachmentResponse[]).map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-body">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="truncate text-left text-brand-secondary hover:underline"
                  onClick={() => setPreview({ id: a.id, fileName: a.fileName, contentType: a.contentType })}
                >
                  {a.fileName}
                </button>
                <a
                  href={`/api/attachments/${a.id}/download`}
                  className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Existing change requests */}
      {requests.isLoading && <LoadingSpinner label="Loading change requests…" />}
      {requests.data && requests.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-label font-semibold text-muted-foreground">Submitted change requests:</p>
          <NoteList notes={requests.data} onDelete={(noteId) => del.mutateAsync(noteId)} />
        </div>
      )}

      <FilePreview attachment={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Check Out / Check In panel
───────────────────────────────────────────────────────────── */

function CheckoutPanel({
  id,
  isCheckedOut,
  checkedOutByName,
  checkedOutAt,
  onCheckOut,
  onCheckIn,
  checkingOut,
  checkingIn,
}: {
  id: number;
  isCheckedOut: boolean;
  checkedOutByName: string | null;
  checkedOutAt: string | null;
  onCheckOut: () => void;
  onCheckIn: () => void;
  checkingOut: boolean;
  checkingIn: boolean;
}) {
  const uploadMut = useUploadAttachment();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4 bg-warning/10 p-4">
      {isCheckedOut && checkedOutByName && (
        <div className="rounded-md border border-warning/40 bg-warning/20 px-4 py-3 text-body">
          <p className="font-semibold">
            Checked out by <span className="text-brand-primary">{checkedOutByName}</span>
            {checkedOutAt && (
              <span className="font-normal text-muted-foreground">
                {" "}since {formatDateTime(checkedOutAt).replace(" UTC", "")}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!isCheckedOut ? (
          <Button
            className="bg-warning text-slate-950 hover:bg-warning/90"
            disabled={checkingOut}
            onClick={onCheckOut}
          >
            {checkingOut ? "Checking Out…" : "Check Out"}
          </Button>
        ) : (
          <Button
            className="bg-warning text-slate-950 hover:bg-warning/90"
            disabled={checkingIn}
            onClick={onCheckIn}
          >
            {checkingIn ? "Checking In…" : "Check In"}
          </Button>
        )}

        <Button
          className="bg-warning text-slate-950 hover:bg-warning/90"
          disabled={uploadMut.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {uploadMut.isPending ? "Uploading…" : "Upload New Version"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await uploadMut.mutateAsync({ documentId: id, file });
              toast.success("New version uploaded");
            } catch {
              toast.error("Upload failed");
            }
            e.target.value = "";
          }}
        />
      </div>

      <p className="text-label text-muted-foreground">
        Check out the document to lock it for editing. Check it back in when your changes are ready.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   History / Archive panel
───────────────────────────────────────────────────────────── */

function HistoryPanel({
  document: d,
  ownerName,
  folderName,
  id,
}: {
  document: DocumentResponse;
  ownerName: string;
  folderName: string | null;
  id: number;
}) {
  const [subTab, setSubTab] = useState<HistorySubTab>("history");
  const [archiveSearch, setArchiveSearch] = useState("");
  const versions = useDocumentVersions(id);
  const approvals = useDocumentApprovals(id);

  const filteredVersions = (versions.data ?? []).filter((v) =>
    archiveSearch.trim()
      ? v.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        String(v.majorVersion).includes(archiveSearch)
      : true
  );

  function exportCsv() {
    if (!versions.data) return;
    const header = "Name,Version,Owner,Created At,Status\n";
    const rows = versions.data
      .map((v) => `"${v.title}",${v.versionLabel},"${v.createdByName ?? ""}","${v.createdAt}",${v.status}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.documentNumber}-archive.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-warning/10 p-4">
      {/* Sub-tab buttons */}
      <div className="mb-4 flex gap-0">
        <button
          type="button"
          onClick={() => setSubTab("history")}
          className={cn(
            "rounded-l-md border border-border px-4 py-1.5 text-body font-semibold transition",
            subTab === "history"
              ? "bg-warning text-slate-950"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          History
        </button>
        <button
          type="button"
          onClick={() => setSubTab("archive")}
          className={cn(
            "rounded-r-md border border-l-0 border-border px-4 py-1.5 text-body font-semibold transition",
            subTab === "archive"
              ? "bg-warning text-slate-950"
              : "bg-background text-muted-foreground hover:bg-muted"
          )}
        >
          Archive ({versions.data?.length ?? 0})
        </button>
      </div>

      {subTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="text-h3 text-error">History</h3>
            <Button
              size="sm"
              className="bg-warning text-slate-950 hover:bg-warning/90"
              onClick={() => {
                const prev = document.title;
                document.title = d.documentNumber;
                let cleaned = false;
                const cleanup = () => {
                  if (cleaned) return;
                  cleaned = true;
                  document.title = prev;
                  window.removeEventListener("afterprint", cleanup);
                };
                window.addEventListener("afterprint", cleanup);
                window.setTimeout(() => { window.print(); window.setTimeout(cleanup, 1200); }, 100);
              }}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>

          <dl className="space-y-2 text-body">
            <HistoryRow label="Published" value={d.effectiveDate ? formatDate(d.effectiveDate) : "—"} />
            <HistoryRow label="Owner" value={ownerName} />
            <HistoryRow label="Document Number" value={d.documentNumber} />
            <HistoryRow label="Folder" value={folderName ?? "—"} />
            <HistoryRow label="Document Created" value={`${formatDateTime(d.createdAt).replace(" UTC", "")} ${ownerName}`} />
            <HistoryRow label="Document Version" value={`v${d.majorVersion}.${String(d.minorVersion ?? 0).padStart(2, "0")}`} />
            {d.nextReviewDate && <HistoryRow label="Next Review" value={formatDate(d.nextReviewDate)} />}
          </dl>

          {approvals.data && approvals.data.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-label font-semibold text-muted-foreground">Electronic Signatures:</p>
              <ul className="divide-y divide-border rounded-md border border-border bg-background">
                {approvals.data.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="font-medium">{s.signerFullName}</span>
                    <span className="rounded-sm bg-success/15 px-2 py-0.5 text-label font-medium text-success">
                      {s.meaning}
                    </span>
                    <span className="ml-auto text-label text-muted-foreground">
                      {formatDateTime(s.signedAt).replace(" UTC", "")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {subTab === "archive" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-warning text-slate-950 hover:bg-warning/90"
                onClick={exportCsv}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                CSV
              </Button>
              <Button
                size="sm"
                className="bg-warning text-slate-950 hover:bg-warning/90"
                onClick={() => toast.info("Excel export — coming soon")}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Excel
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="archive-search" className="shrink-0 text-label">
                Search:
              </Label>
              <Input
                id="archive-search"
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-44 border border-border bg-background"
              />
            </div>
          </div>

          {versions.isLoading && <LoadingSpinner label="Loading archive…" />}
          {versions.isError && <ErrorAlert title="Error" message="Failed to load version archive." />}

          {!versions.isLoading && !versions.isError && (
            <>
              <div className="overflow-x-auto rounded-md border border-border bg-background">
                <table className="w-full min-w-[640px] text-body">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left text-label text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Name</th>
                      <th className="px-4 py-2 font-semibold">Version</th>
                      <th className="px-4 py-2 font-semibold">Owner</th>
                      <th className="px-4 py-2 font-semibold">Published Date</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Restore</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVersions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-label text-muted-foreground">
                          {archiveSearch ? "No versions match your search." : "No archived versions."}
                        </td>
                      </tr>
                    ) : (
                      filteredVersions.map((v) => (
                        <tr key={v.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-2 text-brand-secondary hover:underline">
                            <button type="button" onClick={() => toast.info(`Version ${v.versionLabel} — preview coming soon`)}>
                              {v.title}
                            </button>
                          </td>
                          <td className="px-4 py-2">{v.versionLabel}</td>
                          <td className="px-4 py-2">{v.createdByName ?? "—"}</td>
                          <td className="px-4 py-2">{formatDateTime(v.createdAt).replace(" UTC", "")}</td>
                          <td className="px-4 py-2">{v.status}</td>
                          <td className="px-4 py-2">
                            {v.status === "EFFECTIVE" || v.status === "APPROVED" ? (
                              <span className="text-success">✓</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              className="text-label text-brand-secondary hover:underline"
                              onClick={() => toast.info("Restore — coming soon")}
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-label text-muted-foreground">
                Showing {filteredVersions.length} of {versions.data?.length ?? 0}{" "}
                {versions.data?.length === 1 ? "entry" : "entries"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NoteList — shared between Notes and ChangeRequest panels
───────────────────────────────────────────────────────────── */

function NoteList({
  notes,
  onDelete,
}: {
  notes: DocumentNote[];
  onDelete: (noteId: number) => void;
}) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-background">
      {notes.map((n) => (
        <li key={n.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-body">{n.content}</p>
              <p className="mt-1 text-label text-muted-foreground">
                {n.createdByName ?? "—"} · {formatDateTime(n.createdAt).replace(" UTC", "")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(n.id)}
              className="shrink-0 text-muted-foreground hover:text-error"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function HistoryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-8">
      <dt className="w-44 shrink-0 text-muted-foreground">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}
