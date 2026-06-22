"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, MinusCircle, PlusCircle, Search } from "lucide-react";
import { useCreateComplaint } from "@/hooks/useComplaint";
import { useProductList } from "@/hooks/useProduct";
import { useUsers } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ErrorAlert } from "@/components/ui/error-alert";
import { formatDateTime } from "@/lib/format";

// ─── Form schema (only fields the backend accepts) ────────────────────────────

const schema = z.object({
  productId: z.string().min(1, "Product is required"),
  source: z.enum(["CUSTOMER", "INTERNAL"]),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
  complaintDescription: z.string().trim().min(1, "Details are required"),
  reportedBy: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── UI-only collapsible sections ─────────────────────────────────────────────

type SectionKey = "containment" | "documents" | "keywords" | "assignedto";

const INITIAL_SECTIONS: Record<SectionKey, boolean> = {
  containment: false,
  documents: false,
  keywords: false,
  assignedto: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateComplaintPage() {
  const router = useRouter();
  const create = useCreateComplaint();
  const products = useProductList({ status: "ACTIVE", size: 200 });
  const users = useUsers();

  const [sections, setSections] = useState<Record<SectionKey, boolean>>(INITIAL_SECTIONS);
  const [containmentDetails, setContainmentDetails] = useState("");
  const [keywords, setKeywords] = useState("");
  const [assignComment, setAssignComment] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "CUSTOMER", severity: "MINOR" },
  });

  function toggleSection(key: SectionKey) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const c = await create.mutateAsync({
        productId: Number(values.productId),
        complaintDescription: values.complaintDescription,
        source: values.source,
        severity: values.severity,
        reportedBy: values.reportedBy || null,
      });
      toast.success("Complaint created");
      router.push(`/complaints/${c.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the complaint. Please try again.");
    }
  }

  function handleClear() {
    reset();
    setContainmentDetails("");
    setKeywords("");
    setAssignComment("");
    setServerError(null);
  }

  const now = formatDateTime(new Date().toISOString()).replace(" UTC", "");

  return (
    <div className="flex flex-col space-y-3 pb-20">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/complaints">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>
        <span className="rounded bg-destructive px-3 py-1 text-label font-semibold text-white">
          New Complaints
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/complaints">All Complaints</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-0 overflow-hidden rounded-md border border-border">
        {/* ── Copy Prior Complaints ── */}
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <Button type="button" variant="outline" size="sm">
            Copy Prior Complaints
          </Button>
        </div>

        {/* ── Date / Number ── */}
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          <FormCell>
            <Label className="text-label font-semibold">Date: <Required /></Label>
            <Input value={now} readOnly className="mt-1 border border-border bg-background" />
          </FormCell>
          <FormCell>
            <Label className="text-label font-semibold">Number: <Required /></Label>
            <Input
              value="Auto-generated on save"
              readOnly
              className="mt-1 border border-border bg-background text-muted-foreground"
            />
          </FormCell>
        </div>

        {/* ── FROM / ABOUT ── */}
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
          <FormCell>
            <Label className="text-label font-semibold">
              FROM: <Required />
            </Label>
            <div className="mt-1 flex gap-2">
              <Select {...register("source")}>
                <option value="CUSTOMER">Customers</option>
                <option value="INTERNAL">Internal</option>
              </Select>
              <Input
                placeholder="Name / contact"
                {...register("reportedBy")}
                className="flex-1 border border-border bg-background"
              />
            </div>
          </FormCell>
          <FormCell>
            <Label className="text-label font-semibold">
              ABOUT: <Required />
            </Label>
            <Select
              aria-invalid={!!errors.productId}
              {...register("productId")}
              className="mt-1 w-full"
            >
              <option value="">Select a product…</option>
              {products.data?.content.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.productCode} — {p.name}
                </option>
              ))}
            </Select>
            {errors.productId && (
              <p className="mt-1 text-label text-error">{errors.productId.message}</p>
            )}
          </FormCell>
        </div>

        {/* ── Severity / Type / Format Received ── */}
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <FormCell>
            <Label className="text-label font-semibold">
              Severity: <Required />
            </Label>
            <Select {...register("severity")} className="mt-1">
              <option value="MINOR">3 - Minor</option>
              <option value="MAJOR">2 - Major</option>
              <option value="CRITICAL">1 - Critical</option>
            </Select>
          </FormCell>
          <FormCell>
            <Label className="text-label font-semibold">Type:</Label>
            <Select defaultValue="" className="mt-1">
              <option value="">Select</option>
              <option value="Product Quality">Product Quality</option>
              <option value="Service">Service</option>
              <option value="Labelling">Labelling</option>
              <option value="Packaging">Packaging</option>
              <option value="Delivery">Delivery</option>
              <option value="Other">Other</option>
            </Select>
          </FormCell>
          <FormCell>
            <Label className="text-label font-semibold">Format Received:</Label>
            <Select defaultValue="" className="mt-1">
              <option value="">Select</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="Letter">Letter</option>
              <option value="In Person">In Person</option>
              <option value="Online Form">Online Form</option>
            </Select>
          </FormCell>
        </div>

        {/* ── Details ── */}
        <div className="border-b border-border bg-background p-4">
          <Label className="mb-2 block text-label font-semibold">
            Details: <Required />
          </Label>
          <Controller
            control={control}
            name="complaintDescription"
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                minHeight={180}
                aria-invalid={!!errors.complaintDescription}
              />
            )}
          />
          {errors.complaintDescription && (
            <p className="mt-1 text-label text-error">{errors.complaintDescription.message}</p>
          )}
        </div>

        {/* ── CONTAINMENT ── */}
        <CollapsibleFormSection
          title="CONTAINMENT:"
          open={sections.containment}
          filled={!!containmentDetails}
          required
          onToggle={() => toggleSection("containment")}
        >
          <div className="space-y-2 p-4">
            <Label className="text-label font-semibold">
              Details: <Required />
            </Label>
            <RichTextEditor
              value={containmentDetails}
              minHeight={160}
              onChange={setContainmentDetails}
            />
          </div>
        </CollapsibleFormSection>

        {/* ── DOCUMENTS ── */}
        <CollapsibleFormSection
          title="DOCUMENTS:"
          open={sections.documents}
          filled={false}
          required
          onToggle={() => toggleSection("documents")}
        >
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-label font-semibold">
                Search &amp; Select Internal Documents:
              </Label>
              <div className="flex">
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
              <TransferBox title="Showing all 0" items={[]} />
              <TransferBox title="Empty list" items={[]} />
            </div>
            <div className="space-y-2">
              <Label className="text-label font-semibold">External Documents:</Label>
              <Button
                type="button"
                className="bg-warning text-slate-950 hover:bg-warning/90"
              >
                Click to Upload
              </Button>
            </div>
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

        {/* ── ASSIGNED TO ── */}
        <CollapsibleFormSection
          title="ASSIGNED TO:"
          open={sections.assignedto}
          filled={!!assignComment}
          onToggle={() => toggleSection("assignedto")}
        >
          <div className="space-y-4 p-4">
            <p className="text-label text-destructive">
              You have Dispatch rules. If you select options from the Status AND Assign To drop down
              lists then they will overrule your Dispatch rules
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-label font-semibold">Status:</Label>
                <Select defaultValue="">
                  <option value="">Select</option>
                  <option value="OPEN">Open</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-label font-semibold">Assign To:</Label>
                <Select defaultValue="">
                  <option value="">Select</option>
                  {users.data?.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.fullName}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-label font-semibold">Comment:</Label>
              <RichTextEditor
                value={assignComment}
                minHeight={140}
                onChange={setAssignComment}
              />
            </div>
          </div>
        </CollapsibleFormSection>

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
            <Link href="/complaints">Close</Link>
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
  required,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  filled: boolean;
  required?: boolean;
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
        {filled && (
          <span className="h-3 w-3 rounded-full bg-success" title="Has content" />
        )}
        {required && (
          <span className="rounded-full bg-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
            req
          </span>
        )}
        <span className="ml-auto text-muted-foreground">
          {open ? <MinusCircle className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
        </span>
      </button>
      {open ? <div className="bg-muted/10">{children}</div> : null}
    </section>
  );
}

function TransferBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-3">
        <p className="text-body">{title}</p>
        <Input className="mt-2 border border-border bg-background" placeholder="Filter" />
      </div>
      <div className="h-40 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="text-label text-muted-foreground">Empty list</p>
        ) : (
          items.map((item) => (
            <p key={item} className="text-body">
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
