"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, HelpCircle, List, Search } from "lucide-react";
import { useCreateNonConformance } from "@/hooks/useNonConformances";
import { useProductList } from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { type NcType } from "@/types/nonconformance";

// ─── Importance → NcType mapping ──────────────────────────────────────────────

const IMPORTANCE_OPTIONS = [
  { value: "CRITICAL", label: "Critical", ncType: "PRODUCT" as NcType },
  { value: "MAJOR",    label: "Major",    ncType: "MATERIAL" as NcType },
  { value: "MINOR",    label: "Minor",    ncType: "PROCESS" as NcType },
  { value: "NA",       label: "N/A",      ncType: "PROCESS" as NcType },
];

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  productId:   z.string().optional(),
  productRef:  z.string().optional(),
  importance:  z.enum(["CRITICAL", "MAJOR", "MINOR", "NA"]).default("MINOR"),
  description: z.string().trim().min(1, "Details are required"),
});
type FormValues = z.infer<typeof schema>;

// ─── Section keys ─────────────────────────────────────────────────────────────

type SectionKey = "containment" | "keywords" | "documents";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewNonConformancePage() {
  const router    = useRouter();
  const create    = useCreateNonConformance();
  const products  = useProductList({ status: "ACTIVE", size: 200 });
  const users     = useUsers();

  // CONTAINMENT starts expanded to match isoTracker
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    containment: true,
    keywords:    false,
    documents:   false,
  });
  const [containmentDetails, setContainmentDetails] = useState("");
  const [keywords,           setKeywords]           = useState("");
  const [assignStatus,       setAssignStatus]       = useState("");
  const [assignTo,           setAssignTo]           = useState("");
  const [assignComment,      setAssignComment]      = useState("");
  const [serverError,        setServerError]        = useState<string | null>(null);

  const now = new Date();
  const dateDisplay = formatDateDisplay(now);

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { importance: "MINOR" },
  });

  function toggleSection(key: SectionKey) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const imp    = IMPORTANCE_OPTIONS.find((o) => o.value === values.importance);
    const ncType = imp?.ncType ?? "PROCESS";
    try {
      const nc = await create.mutateAsync({
        title:            values.description.slice(0, 100),
        description:      values.description,
        ncType,
        affectedItemId:   values.productId ? Number(values.productId) : null,
        affectedItemType: values.productId ? "PRODUCT" : null,
        discoveredBy:     null,
      });
      toast.success("Non-conformance created");
      router.push(`/non-conformances/${nc.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the non-conformance. Please try again.");
    }
  }

  function handleClear() {
    reset({ importance: "MINOR" });
    setContainmentDetails("");
    setKeywords("");
    setAssignStatus("");
    setAssignTo("");
    setAssignComment("");
    setServerError(null);
  }

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
        <span className="rounded bg-brand-primary px-3 py-1 text-label font-semibold text-white">
          New Non-Conformance
        </span>
        <Button variant="ghost" size="sm">Action Required</Button>
        <Button variant="ghost" size="sm">My Non-Conformance</Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/non-conformances">All Non-Conformance</Link>
        </Button>
        <Button variant="ghost" size="sm">Set-Up</Button>
        <Button variant="ghost" size="sm">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="overflow-hidden rounded-md border border-border bg-background"
      >
        {/* ── Copy Prior NC ── */}
        <div className="border-b border-border p-4">
          <Button type="button" className="bg-brand-primary text-white hover:bg-brand-primary/90" size="sm">
            Copy Prior Non-Conformance
          </Button>
        </div>

        {/* ── Date / Number ── */}
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          <div className="bg-background p-4">
            <div className="mb-1 flex items-center gap-1">
              <Label className="text-label font-semibold">Date:</Label>
              <span className="text-destructive">*</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={dateDisplay}
                className="border border-border bg-background font-mono text-sm"
              />
              <Button type="button" variant="outline" size="icon">
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-background p-4">
            <Label className="mb-1 block text-label font-semibold">Number:</Label>
            <Input
              readOnly
              value="Non-Conformance"
              className="border border-border bg-muted/30 text-muted-foreground"
            />
          </div>
        </div>

        {/* ── ABOUT ── */}
        <div className="border-b border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-1">
            <span className="text-label font-bold uppercase">About:</span>
            <span className="text-destructive">*</span>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-[220px] flex-1">
              <Select {...register("productId")} className="w-full">
                <option value="">Products</option>
                {products.data?.content.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.productCode} — {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex min-w-[180px] flex-1 items-center gap-1">
              <Input
                {...register("productRef")}
                placeholder=""
                className="flex-1 border border-border bg-background"
              />
              <Button type="button" variant="outline" size="icon">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <button type="button" className="mt-2 text-label text-brand-primary hover:underline">
            or Add New Products
          </button>
        </div>

        {/* ── NON-CONFORMANCE RECORD ── */}
        <div className="border-b border-border">
          {/* Header row — plain white */}
          <div className="border-b border-border bg-background px-4 py-3">
            <span className="text-label font-bold uppercase tracking-wide">Non-Conformance Record:</span>
          </div>
          {/* Content — lavender background */}
          <div className="bg-[#e8eaf6] p-4">
            <div className="mb-4">
              <Button type="button" className="bg-brand-primary text-white hover:bg-brand-primary/90" size="sm">
                Prior NCR Details
              </Button>
            </div>

            {/* Importance */}
            <div className="mb-4">
              <Label className="mb-1 block text-label font-semibold">Importance:</Label>
              <Select {...register("importance")} className="max-w-xs bg-white">
                <option value="">Select</option>
                {IMPORTANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>

            {/* Details */}
            <div className="mb-4">
              <div className="mb-1 flex items-center gap-1">
                <Label className="text-label font-semibold">Details:</Label>
                <span className="text-destructive">*</span>
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

            {/* Documents (inside NCR) */}
            <div>
              <Label className="mb-2 block text-label font-semibold">Documents:</Label>
              <Button
                type="button"
                className="bg-brand-primary text-white hover:bg-brand-primary/90"
                size="sm"
              >
                Click to Upload
              </Button>
            </div>
          </div>
        </div>

        {/* ── CONTAINMENT (starts expanded) ── */}
        <NcSection
          title="CONTAINMENT:"
          open={sections.containment}
          showHelp
          onToggle={() => toggleSection("containment")}
        >
          <div className="p-4">
            <div className="mb-1 flex items-center gap-1">
              <Label className="text-label font-semibold">Details:</Label>
              <span className="text-destructive">*</span>
            </div>
            <RichTextEditor
              value={containmentDetails}
              minHeight={160}
              onChange={setContainmentDetails}
            />
            {!containmentDetails && (
              <p className="mt-1 text-label text-destructive">
                Please enter the details of the Containment.
              </p>
            )}
          </div>
        </NcSection>

        {/* ── KEYWORDS ── */}
        <NcSection
          title="KEYWORDS:"
          open={sections.keywords}
          onToggle={() => toggleSection("keywords")}
        >
          <div className="p-4">
            <Label className="mb-1 block text-label font-semibold">Keywords:</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Select a Keyword"
              className="border border-border bg-background"
            />
          </div>
        </NcSection>

        {/* ── DOCUMENTS ── */}
        <NcSection
          title="DOCUMENTS:"
          open={sections.documents}
          showHelp
          onToggle={() => toggleSection("documents")}
        >
          <div className="p-4 space-y-4">
            <div>
              <Label className="mb-2 block text-label font-semibold">
                Select &amp; Search Internal Documents:
              </Label>
              <div className="flex gap-1">
                <Input placeholder="Search here..." className="border border-border bg-background" />
                <Button type="button" variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Dual transfer list */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left panel */}
              <div className="rounded border border-border bg-background">
                <div className="border-b border-border p-2">
                  <p className="text-label font-medium">Showing all 0</p>
                  <Input className="mt-1.5 h-7 text-sm" placeholder="Filter" />
                </div>
                {/* Transfer-right buttons */}
                <div className="flex border-b border-border">
                  <button
                    type="button"
                    className="flex-1 border-r border-border py-1.5 text-center text-sm font-bold hover:bg-muted"
                    title="Move all right"
                  >
                    »
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-1.5 text-center text-sm font-bold hover:bg-muted"
                    title="Move selected right"
                  >
                    ›
                  </button>
                </div>
                <div className="h-40 overflow-y-auto p-2">
                  <p className="text-label text-muted-foreground">Empty list</p>
                </div>
              </div>

              {/* Right panel */}
              <div className="rounded border border-border bg-background">
                <div className="border-b border-border p-2">
                  <p className="text-label font-medium">Empty list</p>
                  <Input className="mt-1.5 h-7 text-sm" placeholder="Filter" />
                </div>
                {/* Transfer-left buttons */}
                <div className="flex border-b border-border">
                  <button
                    type="button"
                    className="flex-1 border-r border-border py-1.5 text-center text-sm font-bold hover:bg-muted"
                    title="Move selected left"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-1.5 text-center text-sm font-bold hover:bg-muted"
                    title="Move all left"
                  >
                    «
                  </button>
                </div>
                <div className="h-40 overflow-y-auto p-2">
                  <p className="text-label text-muted-foreground">Empty list</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-label font-semibold">External Documents:</Label>
              <Button
                type="button"
                className="bg-brand-primary text-white hover:bg-brand-primary/90"
                size="sm"
              >
                Click to Upload
              </Button>
            </div>
          </div>
        </NcSection>

        {/* ── ASSIGNED TO ── */}
        <div className="border-b border-border bg-background p-4">
          <p className="mb-3 text-label font-bold uppercase">Assigned To:</p>
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
              minHeight={140}
              onChange={setAssignComment}
            />
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background px-4 py-3">
          <Button
            type="submit"
            className="bg-brand-primary text-white hover:bg-brand-primary/90"
            disabled={create.isPending}
          >
            {create.isPending ? "Submitting…" : "Submit"}
          </Button>
          <Button type="button" variant="outline" onClick={handleClear} disabled={create.isPending}>
            Clear
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/non-conformances">Close</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── NcSection ────────────────────────────────────────────────────────────────

function NcSection({
  title,
  open,
  showHelp,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  showHelp?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2 bg-muted/30 px-4 py-2.5 text-left hover:bg-muted/50"
        onClick={onToggle}
      >
        {/* Green circle toggle icon */}
        <GreenToggle open={open} />
        <span className="text-body font-semibold">{title}</span>
        {showHelp && <HelpCircle className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="bg-background">{children}</div>}
    </section>
  );
}

function GreenToggle({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
        open ? "bg-green-600" : "bg-green-500"
      )}
    >
      {open ? "−" : "+"}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateDisplay(d: Date) {
  const day = d.getDate().toString().padStart(2, "0");
  const mon = d.toLocaleString("en", { month: "short" });
  const yr  = d.getFullYear();
  const hh  = d.getHours().toString().padStart(2, "0");
  const mm  = d.getMinutes().toString().padStart(2, "0");
  return `${day}-${mon}-${yr} ${hh}:${mm}`;
}
