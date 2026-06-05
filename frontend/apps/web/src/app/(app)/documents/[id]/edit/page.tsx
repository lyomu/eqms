"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useDocument, useUpdateDocument } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
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
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const doc = useDocument(id);
  const update = useUpdateDocument();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Prefill once the document loads.
  useEffect(() => {
    if (doc.data) {
      reset({
        title: doc.data.title,
        type: doc.data.type,
        content: doc.data.content ?? "",
        reviewPeriodMonths: doc.data.reviewPeriodMonths ? String(doc.data.reviewPeriodMonths) : "",
        reason: "",
      });
    }
  }, [doc.data, reset]);

  if (doc.isLoading) return <LoadingScreen label="Loading document…" />;
  if (doc.isError || !doc.data) {
    return <ErrorAlert title="Error" message="Failed to load this document." />;
  }
  const d = doc.data;

  // Locked unless Draft.
  if (d.status !== "DRAFT") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-h3 text-brand-primary">Document is locked</p>
            <p className="text-body text-muted-foreground">
              {d.documentNumber} is {d.status.replace(/_/g, " ").toLowerCase()} and can only be edited
              while in Draft.
            </p>
            <Button asChild>
              <Link href={`/documents/${id}`}>Back to document</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await update.mutateAsync({
        id,
        expectedVersion: d.version,
        title: values.title,
        type: values.type,
        content: values.content,
        reviewPeriodMonths: values.reviewPeriodMonths ? Number(values.reviewPeriodMonths) : null,
        reason: values.reason || undefined,
      });
      toast.success("Document saved");
      router.push(`/documents/${id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      if (ax.response?.status === 409) {
        setServerError("This document was changed elsewhere. Reload and try again.");
      } else if (ax.response?.status === 422) {
        setServerError("This document can no longer be edited (not in Draft).");
      } else {
        setServerError(ax.response?.data?.message ?? "Could not save changes. Please try again.");
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">Edit {d.documentNumber}</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href={`/documents/${id}`}>Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit document (Draft)</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason for change (audit trail)</Label>
              <Input id="reason" placeholder="e.g. Clarified scope" {...register("reason")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline">
                <Link href={`/documents/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
