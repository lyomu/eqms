"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useCreateDeviation } from "@/hooks/useDeviation";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type DeviationCategory } from "@/types/deviation";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
  description: z.string().trim().min(1, "Description is required"),
  deviationType: z.enum(["PLANNED", "UNPLANNED"]).optional(),
  category: z.string().optional(),
  department: z.string().optional(),
  dateDiscovered: z.string().optional(),
  initialRiskLevel: z.string().optional(),
  immediateAction: z.string().optional(),
  whatHappened: z.string().optional(),
  // Section B (context)
  relatedModule: z.string().optional(),
  whereHappened: z.string().optional(),
  howDetected: z.string().optional(),
  whoInvolved: z.string().optional(),
  site: z.string().optional(),
  // Section C (workflow)
  targetInvestigationDueDate: z.string().optional(),
  targetClosureDueDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES = Object.keys(CATEGORY_LABELS) as DeviationCategory[];

const RELATED_MODULES = [
  { value: "CAPA", label: "CAPA" },
  { value: "RISK", label: "Risk Management" },
  { value: "CHANGE_CONTROL", label: "Change Control" },
  { value: "OOS_OOT", label: "OOS / OOT" },
  { value: "NCR", label: "Non-Conformance" },
  { value: "COMPLAINT", label: "Complaint" },
  { value: "AUDIT", label: "Audit" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "DOCUMENT", label: "Document" },
  { value: "TRAINING", label: "Training" },
  { value: "MATERIAL", label: "Material" },
  { value: "PRODUCT", label: "Product" },
  { value: "BATCH_RECORD", label: "Batch Record" },
  { value: "GENERAL", label: "General" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewDeviationPage() {
  const router = useRouter();
  const create = useCreateDeviation();
  const users = useUsers();
  const [serverError, setServerError] = useState<string | null>(null);

  // Boolean flags (not in react-hook-form since they don't go to the backend via schema)
  const [productAffected, setProductAffected] = useState(false);
  const [materialAffected, setMaterialAffected] = useState(false);
  const [batchAffected, setBatchAffected] = useState(false);
  const [equipmentAffected, setEquipmentAffected] = useState(false);
  const [supplierInvolved, setSupplierInvolved] = useState(false);
  const [customerImpact, setCustomerImpact] = useState(false);
  const [regulatoryImpact, setRegulatoryImpact] = useState(false);
  const [dataIntegrityImpact, setDataIntegrityImpact] = useState(false);
  const [containmentRequired, setContainmentRequired] = useState(false);
  const [investigationRequired, setInvestigationRequired] = useState(true);
  const [capaRequired, setCapaRequired] = useState(false);
  const [changeControlRequired, setChangeControlRequired] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "MINOR" },
  });

  const busy = create.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "submit") {
    setServerError(null);
    try {
      const d = await create.mutateAsync({
        title: values.title,
        severity: values.severity,
        description: values.description,
        immediateAction: values.immediateAction || null,
        occurredDate: values.dateDiscovered || null,
        // Extended fields
        deviationType: values.deviationType || undefined,
        category: values.category || undefined,
        relatedModule: values.relatedModule || undefined,
        department: values.department || undefined,
        initialRiskLevel: values.initialRiskLevel || undefined,
        whatHappened: values.whatHappened || undefined,
        productAffected,
        materialAffected,
        batchAffected,
        equipmentAffected,
        supplierInvolved,
        customerImpactPossible: customerImpact,
        regulatoryImpactPossible: regulatoryImpact,
        dataIntegrityImpactPossible: dataIntegrityImpact,
        containmentRequired,
        investigationRequired,
        capaRequired,
        changeControlRequired,
        targetInvestigationDueDate: values.targetInvestigationDueDate || undefined,
        targetClosureDueDate: values.targetClosureDueDate || undefined,
      });
      if (intent === "submit") {
        toast.success("Deviation submitted");
      } else {
        toast.success("Deviation saved as draft");
      }
      router.push(`/deviations/${d.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the deviation. Please try again.");
    }
  }

  return (
    <div className="flex flex-col space-y-4 pb-24">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/deviations"><ArrowLeft className="h-4 w-4" /> Go Back</Link>
        </Button>
        <span className="rounded-full bg-brand-primary px-3 py-1 text-label font-semibold text-white">New Deviation</span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/deviations">Deviation Register</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create deviation" message={serverError} />}

      <form noValidate className="space-y-4">
        {/* ── Section A — Basic Deviation Details ── */}
        <Card>
          <CardHeader><CardTitle>A — Basic Deviation Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Deviation ID */}
            <FormField label="Deviation ID" className="sm:col-span-2">
              <Input value="Auto-generated on save" readOnly className="bg-muted/40 text-muted-foreground" />
            </FormField>

            {/* Title */}
            <FormField label="Deviation Title" required error={errors.title?.message} className="sm:col-span-2">
              <Input placeholder="Enter a clear, concise deviation title" aria-invalid={!!errors.title} {...register("title")} />
            </FormField>

            {/* Deviation Type */}
            <FormField label="Deviation Type" required>
              <Controller
                control={control}
                name="deviationType"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select type…</option>
                    <option value="PLANNED">Planned Deviation</option>
                    <option value="UNPLANNED">Unplanned Deviation</option>
                  </Select>
                )}
              />
            </FormField>

            {/* Category */}
            <FormField label="Deviation Category" required>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </Select>
                )}
              />
            </FormField>

            {/* Department */}
            <FormField label="Department / Area" required>
              <Input placeholder="e.g. QC Laboratory, Manufacturing" {...register("department")} />
            </FormField>

            {/* Date Discovered */}
            <FormField label="Date & Time Discovered">
              <Input type="datetime-local" {...register("dateDiscovered")} />
            </FormField>

            {/* Initial Severity */}
            <FormField label="Initial Severity" required>
              <Controller
                control={control}
                name="severity"
                render={({ field }) => (
                  <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    <option value="MINOR">Minor</option>
                    <option value="MAJOR">Major</option>
                    <option value="CRITICAL">Critical</option>
                  </Select>
                )}
              />
            </FormField>

            {/* Initial Risk Level */}
            <FormField label="Initial Risk Level">
              <Controller
                control={control}
                name="initialRiskLevel"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select risk level…</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </Select>
                )}
              />
            </FormField>

            {/* Description */}
            <FormField label="Deviation Description" required error={errors.description?.message} className="sm:col-span-2">
              <Textarea rows={5} placeholder="Describe what deviated from the expected process or procedure" aria-invalid={!!errors.description} {...register("description")} />
            </FormField>

            {/* Immediate Action */}
            <FormField label="Immediate Action Taken" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Describe any immediate corrective actions already taken" {...register("immediateAction")} />
            </FormField>

            {/* What Happened */}
            <FormField label="What Happened?" className="sm:col-span-2">
              <Textarea rows={3} placeholder="Narrative description of the deviation event" {...register("whatHappened")} />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section B — Event Context ── */}
        <Card>
          <CardHeader><CardTitle>B — Event Context</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Related Module */}
            <FormField label="Related Module">
              <Controller
                control={control}
                name="relatedModule"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">None / Not applicable</option>
                    {RELATED_MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                )}
              />
            </FormField>

            {/* Site / Location */}
            <FormField label="Site / Location">
              <Input placeholder="e.g. Site A, Building 2, Room 101" {...register("site")} />
            </FormField>

            {/* Where */}
            <FormField label="Where Did It Happen?">
              <Input placeholder="Specific area, equipment, or step" {...register("whereHappened")} />
            </FormField>

            {/* How detected */}
            <FormField label="How Was It Detected?">
              <Input placeholder="e.g. In-process check, QC review, operator observation" {...register("howDetected")} />
            </FormField>

            {/* Who involved */}
            <FormField label="Who Was Involved?">
              <Input placeholder="Names, roles, or departments involved" {...register("whoInvolved")} />
            </FormField>

            {/* Deviation Owner */}
            <FormField label="Deviation Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
              </Select>
            </FormField>

            {/* QA Owner */}
            <FormField label="QA Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
              </Select>
            </FormField>

            {/* Affected items */}
            <FormField label="Affected Items" className="sm:col-span-2">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Product Affected", val: productAffected, set: setProductAffected },
                  { label: "Material Affected", val: materialAffected, set: setMaterialAffected },
                  { label: "Batch Affected", val: batchAffected, set: setBatchAffected },
                  { label: "Equipment Affected", val: equipmentAffected, set: setEquipmentAffected },
                  { label: "Supplier Involved", val: supplierInvolved, set: setSupplierInvolved },
                ].map(({ label, val, set }) => (
                  <label key={label} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors", val ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border bg-background hover:bg-accent/30")}>
                    <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>

            {/* Impact flags */}
            <FormField label="Potential Impact" className="sm:col-span-2">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Customer / Patient Impact Possible", val: customerImpact, set: setCustomerImpact },
                  { label: "Regulatory Impact Possible", val: regulatoryImpact, set: setRegulatoryImpact },
                  { label: "Data Integrity Impact Possible", val: dataIntegrityImpact, set: setDataIntegrityImpact },
                ].map(({ label, val, set }) => (
                  <label key={label} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors", val ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border bg-background hover:bg-accent/30")}>
                    <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section C — Initial Workflow ── */}
        <Card>
          <CardHeader><CardTitle>C — Initial Workflow & Classification</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Required actions */}
            <FormField label="Actions Required" className="sm:col-span-2">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Immediate Containment Required", val: containmentRequired, set: setContainmentRequired },
                  { label: "Investigation Required", val: investigationRequired, set: setInvestigationRequired },
                  { label: "CAPA Likely Required", val: capaRequired, set: setCapaRequired },
                  { label: "Change Control Likely Required", val: changeControlRequired, set: setChangeControlRequired },
                ].map(({ label, val, set }) => (
                  <label key={label} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors", val ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border bg-background hover:bg-accent/30")}>
                    <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>

            {/* Target Investigation Due Date */}
            <FormField label="Target Investigation Due Date">
              <Input type="date" {...register("targetInvestigationDueDate")} />
            </FormField>

            {/* Target Closure Due Date */}
            <FormField label="Target Closure Due Date">
              <Input type="date" {...register("targetClosureDueDate")} />
            </FormField>

            {/* Initial Status */}
            <FormField label="Initial Status">
              <Select disabled defaultValue="DRAFT" className="bg-muted/40">
                <option value="DRAFT">Draft (Save as Draft)</option>
                <option value="REPORTED">Reported (Submit Deviation)</option>
              </Select>
            </FormField>

            <p className="text-label text-muted-foreground sm:col-span-2">
              Formal investigation, root cause analysis, CAPA, and QA approval will be completed in subsequent workflow stages. Submission records a 21 CFR Part 11–compliant audit entry.
            </p>
          </CardContent>
        </Card>

        {/* ── Sticky action bar ── */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "draft"))}>
            Save as Draft
          </Button>
          <Button
            type="button"
            className="bg-brand-primary text-white hover:bg-brand-primary/90"
            disabled={busy}
            onClick={handleSubmit((v) => onSubmit(v, "submit"))}
          >
            {busy ? "Saving…" : "Submit Deviation"}
          </Button>
          <Button asChild variant="ghost" disabled={busy}>
            <Link href="/deviations">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </Label>
      {children}
      {error && <p className="text-label text-error">{error}</p>}
    </div>
  );
}
