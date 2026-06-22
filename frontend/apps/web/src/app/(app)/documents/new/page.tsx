"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  FileClock,
  FilePlus2,
  FileText,
  FolderOpen,
  Info,
  Paperclip,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateDocument,
  useDocumentAction,
  useDocumentFolders,
  useUploadAttachment,
} from "@/hooks/useDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS, type DocumentFolder, type DocumentTypeKey } from "@/types/documents";

const TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentTypeKey[];

function flattenFolders(
  folders: DocumentFolder[],
  depth = 0,
): { id: number; name: string; indent: string }[] {
  const result: { id: number; name: string; indent: string }[] = [];
  for (const folder of folders) {
    result.push({ id: folder.id, name: folder.name, indent: "  ".repeat(depth) });
    result.push(...flattenFolders(folder.children, depth + 1));
  }
  return result;
}

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(["SOP", "WORK_INSTRUCTION", "POLICY", "FORM", "SPECIFICATION", "OTHER"]),
  content: z.string().trim().min(1, "Content is required"),
  reviewPeriodMonths: z
    .string()
    .optional()
    .refine((value) => !value || (/^\d+$/.test(value) && Number(value) > 0), "Must be a positive number"),
});

type FormValues = z.infer<typeof schema>;
type SaveIntent = "draft" | "review";

export default function CreateDocumentPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const create = useCreateDocument();
  const submitForReview = useDocumentAction();
  const uploadAttachment = useUploadAttachment();
  const foldersQuery = useDocumentFolders();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [folderId, setFolderId] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveIntent, setSaveIntent] = useState<SaveIntent | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", type: "SOP", content: "", reviewPeriodMonths: "12" },
  });

  const busy = create.isPending || submitForReview.isPending || uploadAttachment.isPending || saveIntent !== null;
  const flatFolders = flattenFolders(foldersQuery.data ?? []);

  function extractError(error: unknown): string {
    const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string> }>;
    return axiosError.response?.data?.message ?? "Could not save the document. Please try again.";
  }

  function addFiles(incoming: File[]) {
    setFiles((current) => {
      const known = new Set(current.map(fileKey));
      return [...current, ...incoming.filter((file) => !known.has(fileKey(file)))];
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function onSubmit(values: FormValues, intent: SaveIntent) {
    setServerError(null);
    setSaveIntent(intent);
    try {
      const document = await create.mutateAsync({
        title: values.title,
        type: values.type,
        content: values.content,
        reviewPeriodMonths: values.reviewPeriodMonths ? Number(values.reviewPeriodMonths) : null,
        folderId: folderId ? Number(folderId) : null,
      });

      for (const file of files) {
        await uploadAttachment.mutateAsync({ documentId: document.id, file });
      }

      if (intent === "review") {
        await submitForReview.mutateAsync({
          id: document.id,
          action: "submit-for-review",
          expectedVersion: document.version,
          reason: "Submitted for review",
        });
      }

      toast.success(intent === "review" ? "Document submitted for review" : "Draft document saved");
      router.push(`/documents/${document.id}`);
    } catch (error) {
      setServerError(extractError(error));
      setSaveIntent(null);
    }
  }

  return (
    <div className="space-y-5">
      <nav aria-label="Document actions" className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 p-2">
        <ToolbarLink href="/documents" icon={<ArrowLeft className="h-4 w-4" />}>Go Back</ToolbarLink>
        <ToolbarLink active href="/documents/new" icon={<FilePlus2 className="h-4 w-4" />}>New Document</ToolbarLink>
        <ToolbarLink href="/documents" icon={<FileText className="h-4 w-4" />}>All Documents</ToolbarLink>
        <ToolbarLink href="/documents" icon={<FolderOpen className="h-4 w-4" />}>Browse Folders</ToolbarLink>
        <ToolbarLink href="/search" icon={<Search className="h-4 w-4" />}>Search</ToolbarLink>
      </nav>

      <div className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="info">Document Control</Badge>
            <span className="text-label text-muted-foreground">New controlled record</span>
          </div>
          <h1 className="text-h1 text-brand-primary">Create New Document</h1>
          <p className="mt-1 max-w-3xl text-body text-muted-foreground">
            Capture the document, place it in the correct folder, and start its controlled review lifecycle.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="self-start lg:self-auto">
          <Link href="/documents">Cancel</Link>
        </Button>
      </div>

      {serverError ? <ErrorAlert title="Couldn't save the document" message={serverError} /> : null}

      <form className="space-y-5" noValidate>
        <Card className="overflow-hidden border-t-4 border-t-brand-primary">
          <CardHeader className="border-b border-border bg-brand-light/30">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Document Identity</CardTitle>
                <CardDescription>Core metadata used to classify and control this document.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">Draft</Badge>
                <Badge variant="neutral">Version 1.0</Badge>
                <Badge variant="info">Number generated on save</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <FieldBlock label="Title *" htmlFor="title" error={errors.title?.message}>
              <Input
                id="title"
                placeholder="Enter a clear, controlled document title"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
            </FieldBlock>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <FieldBlock label="Document type *" htmlFor="type">
                <Select id="type" {...register("type")}>
                  {TYPES.map((type) => <option key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</option>)}
                </Select>
              </FieldBlock>
              <FieldBlock label="Folder" htmlFor="folder" hint="Choose where users will find this document.">
                <Select id="folder" value={folderId} onChange={(event) => setFolderId(event.target.value)}>
                  <option value="">No folder</option>
                  {flatFolders.map((folder) => (
                    <option key={folder.id} value={String(folder.id)}>{folder.indent}{folder.name}</option>
                  ))}
                </Select>
              </FieldBlock>
              <FieldBlock label="Owner" htmlFor="owner" hint="The creator becomes the document owner.">
                <Input id="owner" value={currentUser?.fullName ?? "Current user"} readOnly className="bg-muted/30" />
              </FieldBlock>
              <FieldBlock label="Review period" htmlFor="reviewPeriodMonths" hint="Months until the next scheduled review." error={errors.reviewPeriodMonths?.message}>
                <div className="relative">
                  <Input
                    id="reviewPeriodMonths"
                    inputMode="numeric"
                    className="pr-20"
                    aria-invalid={!!errors.reviewPeriodMonths}
                    {...register("reviewPeriodMonths")}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-muted-foreground">months</span>
                </div>
              </FieldBlock>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-slate-400">
          <CardHeader className="border-b border-border bg-slate-100">
            <CardTitle>Source &amp; Supporting Files</CardTitle>
            <CardDescription>Attach the controlled source file and any supporting evidence. Files are integrity-checked when uploaded.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "rounded-lg border-2 border-dashed p-6 transition-colors",
                files.length > 0 ? "border-brand-primary/40 bg-brand-light/15" : "border-border bg-muted/20 hover:border-brand-primary/40",
              )}
            >
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <span className="rounded-full bg-brand-light p-3 text-brand-primary">
                  <UploadCloud className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Drop document files here</p>
                  <p className="mt-1 text-label text-muted-foreground">PDF, Word, Excel, images, or other approved source formats</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <Paperclip className="h-4 w-4" /> Choose files
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </div>

              {files.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {files.map((file) => (
                    <div key={fileKey(file)} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 shadow-sm">
                      <FileText className="h-5 w-5 shrink-0 text-brand-secondary" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium">{file.name}</p>
                        <p className="text-label text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFiles((current) => current.filter((item) => fileKey(item) !== fileKey(file)))}
                        className="rounded p-1 text-muted-foreground hover:bg-error/10 hover:text-error"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-slate-500">
          <CardHeader className="border-b border-border bg-slate-100">
            <CardTitle>Document Content</CardTitle>
            <CardDescription>Author the controlled content that will be reviewed, approved, and versioned.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <FieldBlock label="Content *" htmlFor="content" error={errors.content?.message}>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    id="content"
                    value={field.value}
                    onChange={field.onChange}
                    minHeight={280}
                    aria-invalid={!!errors.content}
                  />
                )}
              />
            </FieldBlock>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-success">
          <CardHeader className="border-b border-success/20 bg-success/10">
            <CardTitle>Control &amp; Routing</CardTitle>
            <CardDescription>Confirm how this record enters the controlled document lifecycle.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 lg:grid-cols-3">
            <RoutingItem icon={<ShieldCheck className="h-5 w-5" />} title="Controlled ownership" description={currentUser?.fullName ?? "Assigned to the creator"} />
            <RoutingItem icon={<FileClock className="h-5 w-5" />} title="Initial state" description="Saved as Draft until submitted" />
            <RoutingItem icon={<CheckCircle2 className="h-5 w-5" />} title="Review workflow" description="Submit to move the document to Under Review" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/60 p-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-2 text-label text-muted-foreground lg:max-w-xl">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Save a draft to continue editing, or submit now to begin the controlled review workflow.</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row lg:ml-auto">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => router.push("/documents")}>Cancel</Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleSubmit((values) => onSubmit(values, "draft"))}
            >
              {saveIntent === "draft" ? "Saving draft..." : "Save as Draft"}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={handleSubmit((values) => onSubmit(values, "review"))}
            >
              <CheckCircle2 className="h-4 w-4" />
              {saveIntent === "review" ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ToolbarLink({ href, icon, active = false, children }: { href: string; icon: ReactNode; active?: boolean; children: ReactNode }) {
  return (
    <Button
      asChild
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(!active && "bg-background text-muted-foreground")}
    >
      <Link href={href}>{icon}{children}</Link>
    </Button>
  );
}

function FieldBlock({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-label text-error">{error}</p> : hint ? <p className="text-label text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RoutingItem({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
      <span className="text-success">{icon}</span>
      <div>
        <p className="text-body font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-label text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
