"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download, FileText, MessageSquare, Paperclip, Printer, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  useAddRecordComment,
  useDeleteRecordComment,
  useRecordIsoReadiness,
  useRecordAttachments,
  useRecordComments,
  useUploadRecordAttachment,
} from "@/hooks/useRecordDossier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IsoReadinessPanel } from "@/components/common/IsoReadinessPanel";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

interface DossierField {
  label: string;
  value: ReactNode;
}

interface DossierSection {
  title: string;
  content: ReactNode;
}

interface RecordDossierPanelProps {
  recordType: string;
  recordId: number | string;
  recordNumber: string;
  title: string;
  fields?: DossierField[];
  sections?: DossierSection[];
}

type TabKey = "report" | "iso" | "attachments" | "comments";

export function RecordDossierPanel({
  recordType,
  recordId,
  recordNumber,
  title,
  fields = [],
  sections = [],
}: RecordDossierPanelProps) {
  const [tab, setTab] = useState<TabKey>("report");
  const [comment, setComment] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const attachments = useRecordAttachments(recordType, recordId);
  const comments = useRecordComments(recordType, recordId);
  const readiness = useRecordIsoReadiness(recordType, recordId);
  const uploadAttachment = useUploadRecordAttachment(recordType, recordId);
  const addComment = useAddRecordComment(recordType, recordId);
  const deleteComment = useDeleteRecordComment(recordType, recordId);

  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync(file);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Attachment uploaded");
    } catch {
      toast.error("Could not upload attachment.");
    }
  }

  async function submitComment() {
    const content = comment.trim();
    if (!content) return;
    try {
      await addComment.mutateAsync(content);
      setComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Could not add comment.");
    }
  }

  function printReport() {
    const previousTitle = document.title;
    document.title = recordNumber;
    setTab("report");
    window.setTimeout(() => {
      window.print();
      document.title = previousTitle;
    }, 80);
  }

  const attachmentItems = attachments.data ?? [];
  const commentItems = comments.data ?? [];

  return (
    <Card className="print:shadow-none">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <CardTitle>Dossier</CardTitle>
            <p className="mt-1 text-body text-muted-foreground">
              {recordNumber} - {title}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadAttachment.isPending}>
              <Upload className="h-4 w-4" />
              {uploadAttachment.isPending ? "Uploading..." : "Attach File"}
            </Button>
            <Button onClick={printReport}>
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </div>
        </div>
        <Tabs
          active={tab}
          onChange={(key) => setTab(key as TabKey)}
          tabs={[
            { key: "report", label: "Report" },
            { key: "iso", label: "ISO Readiness", count: readiness.data?.blockingMessages.length },
            { key: "attachments", label: "Attachments", count: attachmentItems.length },
            { key: "comments", label: "Comments", count: commentItems.length },
          ]}
          className="print:hidden"
        />
      </CardHeader>
      <CardContent>
        {tab === "report" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {fields.map((field) => (
                <div key={field.label} className="rounded-md border border-border/80 bg-muted/20 p-3">
                  <p className="text-label uppercase text-muted-foreground">{field.label}</p>
                  <div className="mt-1 text-body font-medium">{field.value}</div>
                </div>
              ))}
            </div>
            {sections.length > 0 && (
              <div className="space-y-3">
                {sections.map((section) => (
                  <section key={section.title} className="rounded-md border border-border/80 p-4">
                    <h3 className="text-h3">{section.title}</h3>
                    <div className="mt-2 text-body text-muted-foreground">{section.content}</div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "iso" && (
          <IsoReadinessPanel readiness={readiness.data} isLoading={readiness.isLoading} isError={readiness.isError} />
        )}

        {tab === "attachments" && (
          <div className="space-y-3">
            {attachments.isLoading ? (
              <p className="text-body text-muted-foreground">Loading attachments...</p>
            ) : attachmentItems.length === 0 ? (
              <p className="text-body text-muted-foreground">No attachments yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {attachmentItems.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium">{item.fileName}</p>
                      <p className="text-label text-muted-foreground">
                        {formatBytes(item.sizeBytes)} - Uploaded {formatDateTime(item.uploadedAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/attachments/${item.id}/download`}>
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "comments" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                rows={4}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a regulated comment, observation, or follow-up note..."
              />
              <div className="flex justify-end">
                <Button onClick={submitComment} disabled={addComment.isPending || !comment.trim()}>
                  <MessageSquare className="h-4 w-4" />
                  {addComment.isPending ? "Adding..." : "Add Comment"}
                </Button>
              </div>
            </div>
            {comments.isLoading ? (
              <p className="text-body text-muted-foreground">Loading comments...</p>
            ) : commentItems.length === 0 ? (
              <p className="text-body text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {commentItems.map((item) => (
                  <li key={item.id} className="rounded-md border border-border p-3">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-body">{item.content}</p>
                        <p className="mt-2 text-label text-muted-foreground">
                          {item.createdByName ?? "System"} - {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete comment"
                        disabled={deleteComment.isPending}
                        onClick={() => deleteComment.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
