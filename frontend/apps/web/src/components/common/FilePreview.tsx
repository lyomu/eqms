"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";

export interface PreviewTarget {
  id: number;
  fileName: string;
  contentType?: string | null;
}

interface FilePreviewProps {
  /** The attachment to preview, or null to close. */
  attachment: PreviewTarget | null;
  onClose: () => void;
}

type Kind = "pdf" | "docx" | "image" | "text" | "other";

function detectKind(fileName: string, contentType?: string | null): Kind {
  const ct = (contentType ?? "").toLowerCase();
  const name = fileName.toLowerCase();
  if (ct.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (ct.includes("wordprocessingml") || ct.includes("msword") || name.endsWith(".docx")) return "docx";
  if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(name)) return "image";
  if (ct.startsWith("text/") || /\.(txt|csv|md|log)$/.test(name)) return "text";
  return "other";
}

/**
 * In-app preview for an attachment. Fetches the bytes through the authenticated API
 * (the download endpoint forces a file download, so we render the blob ourselves):
 *   - PDF  -> browser-native viewer in an iframe
 *   - DOCX -> rendered to HTML with docx-preview
 *   - image/text -> inline
 *   - anything else -> download fallback
 */
export function FilePreview({ attachment, onClose }: FilePreviewProps) {
  const open = attachment !== null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  const kind = attachment ? detectKind(attachment.fileName, attachment.contentType) : "other";

  useEffect(() => {
    if (!attachment) return;
    let revoked: string | null = null;
    let cancelled = false;

    async function load(att: PreviewTarget) {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setTextContent(null);
      try {
        const res = await api.get(`/api/attachments/${att.id}/download`, { responseType: "blob" });
        if (cancelled) return;
        const blob = res.data as Blob;
        const k = detectKind(att.fileName, att.contentType);

        if (k === "docx") {
          const { renderAsync } = await import("docx-preview");
          if (cancelled || !docxRef.current) return;
          docxRef.current.innerHTML = "";
          await renderAsync(blob, docxRef.current, undefined, {
            className: "docx",
            inWrapper: true,
            ignoreWidth: true,
          });
        } else if (k === "text") {
          setTextContent(await blob.text());
        } else {
          const url = URL.createObjectURL(blob);
          revoked = url;
          setBlobUrl(url);
        }
      } catch {
        if (!cancelled) setError("Could not load this file for preview. Try downloading it instead.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(attachment);
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [attachment]);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={attachment?.fileName ?? "Preview"}
      className="max-w-5xl"
    >
      <div className="min-h-[60vh]">
        {attachment && (
          <div className="mb-3 flex items-center justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/attachments/${attachment.id}/download`}>
                <Download className="h-4 w-4" /> Download
              </a>
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <LoadingSpinner size={32} label="Loading preview…" />
          </div>
        )}

        {error && !loading && <ErrorAlert title="Preview unavailable" message={error} />}

        {!loading && !error && kind === "pdf" && blobUrl && (
          <iframe title={attachment?.fileName} src={blobUrl} className="h-[70vh] w-full rounded-md border border-border" />
        )}
        {!loading && !error && kind === "image" && blobUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blobUrl} alt={attachment?.fileName} className="max-h-[70vh] max-w-full rounded-md" />
          </div>
        )}
        {!loading && !error && kind === "text" && textContent !== null && (
          <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-body">
            {textContent}
          </pre>
        )}
        {!loading && !error && kind === "other" && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-body text-muted-foreground">This file type can&apos;t be previewed in the browser.</p>
          </div>
        )}
        {/* docx renders here; kept mounted whenever the modal is open so the ref exists during async render */}
        <div
          ref={docxRef}
          className={cn(
            "max-h-[70vh] overflow-auto rounded-md border border-border bg-white p-2",
            (loading || error || kind !== "docx") && "hidden"
          )}
        />
      </div>
    </Modal>
  );
}
