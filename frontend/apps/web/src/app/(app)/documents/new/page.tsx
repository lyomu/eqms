"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateDocument,
  useDocumentAction,
  useUploadAttachment,
} from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { DOCUMENT_TYPE_LABELS, type DocumentTypeKey } from "@/types/documents";

const TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentTypeKey[];

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(["SOP", "WORK_INSTRUCTION", "POLICY", "FORM", "SPECIFICATION", "OTHER"]),
  content: z.string().trim().min(1, "Content is required"),
  reviewPeriodMonths: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) > 0), "Must be a positive number"),
});
type FormValues = z.infer<typeof schema>;

export default function CreateDocumentPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const create = useCreateDocument();
  const submitForReview = useDocumentAction();
  const uploadAttachment = useUploadAttachment();
  const [file, setFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "SOP" },
  });

  const busy = create.isPending || submitForReview.isPending || uploadAttachment.isPending;

  function extractError(err: unknown): string {
    const ax = err as AxiosError<{ message?: string; errors?: Record<string, string> }>;
    return ax.response?.data?.message ?? "Could not save the document. Please try again.";
  }

  async function onSubmit(values: FormValues, intent: "draft" | "review") {
    setServerError(null);
    try {
      const doc = await create.mutateAsync({
        title: values.title,
        type: values.type,
        content: values.content,
        reviewPeriodMonths: values.reviewPeriodMonths ? Number(values.reviewPeriodMonths) : null,
      });
      if (file) {
        await uploadAttachment.mutateAsync({ documentId: doc.id, file });
      }
      if (intent === "review") {
        await submitForReview.mutateAsync({
          id: doc.id,
          action: "submit-for-review",
          expectedVersion: doc.version,
          reason: "Submitted for review",
        });
      }
      toast.success("Document created");
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      setServerError(extractError(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Document</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/documents">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
              {errors.title && <p className="text-label text-error">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type *</Label>
                <Select id="type" {...register("type")}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reviewPeriodMonths">Review period (months)</Label>
                <Input
                  id="reviewPeriodMonths"
                  inputMode="numeric"
                  placeholder="e.g. 12"
                  aria-invalid={!!errors.reviewPeriodMonths}
                  {...register("reviewPeriodMonths")}
                />
                {errors.reviewPeriodMonths && (
                  <p className="text-label text-error">{errors.reviewPeriodMonths.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Content *</Label>
              <Textarea id="content" rows={8} aria-invalid={!!errors.content} {...register("content")} />
              {errors.content && <p className="text-label text-error">{errors.content.message}</p>}
            </div>

            {/* Optional file attachment (stored via the attachments API after create). */}
            <div className="space-y-1.5">
              <Label>Attachment (optional)</Label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/20 p-6 text-center"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-body">
                    <span className="font-medium">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} aria-label="Remove file">
                      <X className="h-4 w-4 text-muted-foreground hover:text-error" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    <p className="text-label text-muted-foreground">Drag &amp; drop a file, or</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                      Choose file
                    </Button>
                  </>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input value={currentUser?.fullName ?? ""} readOnly disabled />
              <p className="text-label text-muted-foreground">
                The document owner is the creator (you).
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleSubmit((v) => onSubmit(v, "draft"))}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={handleSubmit((v) => onSubmit(v, "review"))}
              >
                {busy ? "Saving…" : "Submit for Review"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
