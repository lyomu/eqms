"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, HelpCircle, List, MinusCircle, PlusCircle, Search } from "lucide-react";
import { useCreateNonConformance } from "@/hooks/useNonConformances";
import { useProductList } from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ErrorAlert } from "@/components/ui/error-alert";
import { type NcType } from "@/types/nonconformance";

// ─── Importance → NcType mapping ──────────────────────────────────────────────

const IMPORTANCE_OPTIONS = [
  { value: "CRITICAL", label: "Critical", ncType: "PRODUCT" as NcType },
  { value: "MAJOR", label: "Major", ncType: "MATERIAL" as NcType },
  { value: "MINOR", label: "Minor", ncType: "PROCESS" as NcType },
  { value: "NA", label: "N/A", ncType: "PROCESS" as NcType },
];

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  productId: z.string().optional(),
  productRef: z.string().optional(),
  importance: z.enum(["CRITICAL", "MAJOR", "MINOR", "NA"]).default("MINOR"),
  description: z.string().trim().min(1, "Details are required"),
  discoveredDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Collapsible sections ─────────────────────────────────────────────────────

type SectionKey = "containment" | "keywords" | "documents";

const INITIAL_SECTIONS: Record<SectionKey, boolean> = {
  containment: false,
  keywords: false,
  documents: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewNonConformancePage() {
  const router = useRouter();
  const create = useCreateNonConformance();
  const products = useProductList({ status: "ACTIVE", size: 200 });
  const users = useUsers();

  const [sections, setSections] = useState<Record<SectionKey, boolean>>(INITIAL_SECTIONS);
  const [containmentDetails, setContainmentDetails] = useState("");
  const [keywords, setKeywords] = useState("");
  const [assignStatus, setAssignStatus] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [assignComment, setAssignComment] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const now = new Date();
  const defaultDate = now.toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { importance: "MINOR", discoveredDate: defaultDate },
  });

  function toggleSection(key: SectionKey) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const imp = IMPORTANCE_OPTIONS.find((o) => o.value === values.importance);
    const ncType: NcType = imp?.ncType ?? "PROCESS";

    try {
      const nc = await create.mutateAsync({
        title: values.description.slice(0, 100),
        description: values.description,
        ncType,
        affectedItemId: values.productId ? Number(values.productId) : null,
        affectedItemType: values.productId ? "PRODUCT" : null,
        discoveredBy: null,
      });
      toast.success("Non-conformance created");
      router.push(`/non-conformances/${nc.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the non-conformance. Please try again.");
    }
  }

  function handleClear() {
    reset({ importance: "MINOR", discoveredDate: defaultDate });
    setContainmentDetails("");
    setKeywords("");
    setAssignStatus("");
    setAssignTo("");
    setAssignComment("");
    setServerError(null);
  }

  const dateDisplay = `${now.getDate().toString().padStart(2, "0")}-${now.toLocaleString("en", { month: "short" })}-${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col space-y-3 pb-20">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/non-conformances">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>
        <span className="rounded bg-destructive px-3 py-1 text-label font-semibold text-white">
          New Non-Conformance
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/non-conformances">All Non-Conformances</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-0 overflow-hidden rounded-md border border-border"
      >
        {/* ── Copy Prior NC ── */}
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <Button type="button" variant="outline" size="sm">
            Copy Prior Non-Conformance
          </Button>
        </div>

        {/* ── Date / Number ── */}
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          <FormCell>
            <div className="flex items-center gap-1">
              <Label className="text-label font-semibold">Date:</Label>
              <Required />
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="mt-1 flex items-center gap-1">
              <Input
                type="date"
                {...register("discoveredDate")}
                className="border border-border bg-background"
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{dateDisplay}</p>
          </FormCell>
          <FormCell>
            <Label className="text-label font-semibold">Number:</Label>
            <Input
              value="Non-Conformance"
              readOnly
              className="mt-1 border border-border bg-background text-muted-foreground"
            />
          </FormCell>
        </div>

        {/* ── ABOUT ── */}
        <div className="border-b border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-1">
            <span className="text-label font-semibold uppercase">About:</span>
            <Required />
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[200px] flex-1">
              <Label className="mb-1 block text-label font-semibold">Products</Label>
              <div className="flex gap-1">
                <Select {...register("productId")} className="flex-1">
                  <option value="">Select a product…</option>
                  {products.data?.content.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.productCode} — {p.name}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="outline" size="icon">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="min-w-[160px] flex-1">
              <Label className="mb-1 block text-label font-semibold">Reference</Label>
              <Input
                {...register("productRef")}
                placeholder="Batch / lot no."
                className="border border-border bg-background"
              />
            </div>
          </div>
          <button type="button" className="mt-2 text-label text-brand-primary hover:underline">
            or Add New Products
          </button>
        </div>

        {/* ── NON-CONFORMANCE RECORD ── */}
        <div className="border-b border-border bg-[#e8eaf6] p-4">
          <p className="mb-3 text-label font-bold uppercase tracking-wide text-[#3949ab]">
            Non-Conformance Record
          </p>
          <div className="mb-4 flex gap-2">
            <Button type="button" variant="outline" size="sm">
              Prior NCR Details
            </Button>
          </div>

          {/* Importance */}
          <div className="mb-4">
            <Label className="mb-1 block text-label font-semibold">Importance:</Label>
            <Select {...register("importance")} className="max-w-xs">
              <option value="">Select</option>
              {IMPORTANCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Details */}
          <div className="mb-4">
            <div className="mb-1 flex items-center gap-1">
              <Label className="text-label font-semibold">Details:</Label>
              <Required />
            </div>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  minHeight={180}
                  aria-invalid={!!errors.description}
                />
              )}
            />
            {errors.description && (
              <p className="mt-1 text-label text-error">{errors.description.message}</p>
            )}
          </div>

          {/* Documents (inside NCR section) */}
          <div>
            <Label className="mb-2 block text-label font-semibold">Documents:</Label>
            <Button
              type="button"
              className="bg-warning text-slate-950 hover:bg-warning/90"
              size="sm"
            >
              Click to Upload
            </Button>
          </div>
        </div>

        {/* ── CONTAINMENT ── */}
        <CollapsibleFormSection
          title="CONTAINMENT:"
          open={sections.containment}
          filled={!!containmentDetails}
          onToggle={() => toggleSection("containment")}
          showHelp
        >
          <div className="space-y-2 p-4">
            <Label className="text-label font-semibold">Details:</Label>
            <RichTextEditor
              value={containmentDetails}
              minHeight={140}
              onChange={setContainmentDetails}
            />
          </div>
        </CollapsibleFormSection>

        {/* ── KEYWORDS ── */}
        <CollapsibleFormSection
          title="KEYWORDS:"
          open={sections.keywords}
          filled={!!keywords}
          onToggle={() => toggleSection("keywords")}
        >
          <div className="space-y-2 p-4">
            <Label className="text-label font-semibold">Keywords:</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Add comma-separated keywords"
              className="border border-border bg-background"
            />
          </div>
        </CollapsibleFormSection>

        {/* ── DOCUMENTS ── */}
        <CollapsibleFormSection
          title="DOCUMENTS:"
          open={sections.documents}
          filled={false}
          onToggle={() => toggleSection("documents")}
          showHelp
        >
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-label font-semibold">
                Search &amp; Select Internal Documents:
              </Label>
              <div className="flex gap-1">
                <Input
                  placeholder="Search here…"
                  className="border border-border bg-background"
                />
                <Button type="button" variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TransferBox title="Showing all 0" />
              <TransferBox title="Empty list" />
            </div>
            <div>
              <Label className="mb-2 block text-label font-semibold">External Documents:</Label>
              <Button
                type="button"
                className="bg-warning text-slate-950 hover:bg-warning/90"
                size="sm"
              >
                Click to Upload
              </Button>
            </div>
          </div>
        </CollapsibleFormSection>

        {/* ── ASSIGNED TO ── */}
        <div className="border-b border-border bg-background p-4">
          <p className="mb-3 text-label font-semibold uppercase">Assigned To:</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-label font-semibold">Status:</Label>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Select value={assignStatus} onChange={(e) => setAssignStatus(e.target.value)}>
                <option value="">Select</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-label font-semibold">Assign To:</Label>
              <Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Select</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label className="text-label font-semibold">Comment:</Label>
            <RichTextEditor
              value={assignComment}
              minHeight={120}
              onChange={setAssignComment}
            />
          </div>
        </div>

        {/* ── Bottom action bar ── */}
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background px-4 py-3">
          <Button
            type="submit"
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={create.isPending}
          >
            {create.isPending ? "Submitting…" : "Submit"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={create.isPending}
          >
            Clear
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link href="/non-conformances">Close</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormCell({ children }: { children: ReactNode }) {
  return <div className="bg-background p-4">{children}</div>;
}

function Required() {
  return <span className="text-destructive">*</span>;
}

function CollapsibleFormSection({
  title,
  open,
  filled,
  showHelp,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  filled: boolean;
  showHelp?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-2 bg-slate-200 px-4 py-3 text-left"
        onClick={onToggle}
      >
        <span className="text-body font-semibold">{title}</span>
        {filled && <span className="h-3 w-3 rounded-full bg-success" title="Has content" />}
        {showHelp && <HelpCircle className="h-4 w-4 text-muted-foreground" />}
        <span className="ml-auto text-muted-foreground">
          {open ? <MinusCircle className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
        </span>
      </button>
      {open ? <div className="bg-muted/10">{children}</div> : null}
    </section>
  );
}

function TransferBox({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-3">
        <p className="text-body">{title}</p>
        <Input className="mt-2 border border-border bg-background" placeholder="Filter" />
      </div>
      <div className="flex h-40 items-center justify-center p-3">
        <p className="text-label text-muted-foreground">Empty list</p>
      </div>
    </div>
  );
}
