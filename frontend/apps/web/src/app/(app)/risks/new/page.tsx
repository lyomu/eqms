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
import { useCreateRisk } from "@/hooks/useRisk";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, type RiskCategory } from "@/types/risk";

// ─── Schema ──────────────────────────────────────────────────────────────────

const CATEGORIES = Object.keys(CATEGORY_LABELS) as RiskCategory[];

const schema = z.object({
  title: z.string().trim().min(1, "Risk title is required"),
  category: z.enum(["PRODUCT", "PROCESS", "EQUIPMENT", "ORGANIZATION"]),
  description: z.string().trim().min(1, "Description is required"),
  potentialImpact: z.string().trim().min(1, "Potential impact is required"),
  department: z.string().optional(),
  source: z.string().optional(),
  dateIdentified: z.string().optional(),
  identifiedBy: z.string().optional(),
  dueDate: z.string().optional(),
  hazard: z.string().optional(),
  possibleCause: z.string().optional(),
  possibleEffect: z.string().optional(),
  existingControls: z.string().optional(),
  controlGaps: z.string().optional(),
  affectedProducts: z.string().optional(),
  affectedProcesses: z.string().optional(),
  scope: z.string().optional(),
  criticality: z.string().default("MAJOR"),
});

type FormValues = z.infer<typeof schema>;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewRiskPage() {
  const router = useRouter();
  const create = useCreateRisk();
  const users = useUsers();

  const [serverError, setServerError] = useState<string | null>(null);
  const [customerImpact, setCustomerImpact] = useState(false);
  const [regulatoryImpact, setRegulatoryImpact] = useState(false);
  const [patientImpact, setPatientImpact] = useState(false);
  const [dataIntegrityImpact, setDataIntegrityImpact] = useState(false);
  const [requiresCapa, setRequiresCapa] = useState(false);
  const [requiresQaApproval, setRequiresQaApproval] = useState(true);
  const [requiresEscalation, setRequiresEscalation] = useState(false);
  const [requiresChangeControl, setRequiresChangeControl] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "PROCESS", criticality: "MAJOR" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const r = await create.mutateAsync({
        title: values.title,
        category: values.category,
        description: values.description,
        potentialImpact: values.potentialImpact,
      });
      toast.success("Risk created successfully");
      router.push(`/risks/${r.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the risk. Please try again.");
    }
  }

  return (
    <div className="flex flex-col space-y-4 pb-24">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/risks"><ArrowLeft className="h-4 w-4" /> Go Back</Link>
        </Button>
        <span className="rounded-full bg-brand-primary px-3 py-1 text-label font-semibold text-white">New Risk</span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/risks">Risk Register</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create risk" message={serverError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* ── Section A — Basic Risk Details ── */}
        <Card>
          <CardHeader><CardTitle>A — Basic Risk Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Risk ID */}
            <FormField label="Risk ID" className="sm:col-span-2">
              <Input value="Auto-generated on save" readOnly className="bg-muted/40 text-muted-foreground" />
            </FormField>

            {/* Title */}
            <FormField label="Risk Title" required error={errors.title?.message} className="sm:col-span-2">
              <Input
                placeholder="Enter a clear, concise risk title"
                aria-invalid={!!errors.title}
                {...register("title")}
              />
            </FormField>

            {/* Category */}
            <FormField label="Risk Category" required error={errors.category?.message}>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </Select>
                )}
              />
            </FormField>

            {/* Source */}
            <FormField label="Source of Risk">
              <Select defaultValue="" {...register("source")}>
                <option value="">Select source…</option>
                <option value="AUDIT_FINDING">Audit Finding</option>
                <option value="DEVIATION">Deviation</option>
                <option value="CAPA">CAPA</option>
                <option value="CHANGE_CONTROL">Change Control</option>
                <option value="SUPPLIER_ISSUE">Supplier Issue</option>
                <option value="EQUIPMENT_ISSUE">Equipment Issue</option>
                <option value="COMPLAINT">Complaint</option>
                <option value="OOS_OOT">OOS / OOT</option>
                <option value="MANAGEMENT_REVIEW">Management Review</option>
                <option value="PROCESS_REVIEW">Process Review</option>
                <option value="NEW_PROCESS">New Process</option>
                <option value="MANUAL_ENTRY">Manual Entry</option>
                <option value="OTHER">Other</option>
              </Select>
            </FormField>

            {/* Department */}
            <FormField label="Department / Process Area" required error={errors.department?.message}>
              <Input placeholder="e.g. QC Laboratory, Manufacturing" {...register("department")} />
            </FormField>

            {/* Risk Owner */}
            <FormField label="Risk Owner" required>
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
              </Select>
            </FormField>

            {/* QA Owner */}
            <FormField label="QA Owner / Reviewer">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
              </Select>
            </FormField>

            {/* Date Identified */}
            <FormField label="Date Identified">
              <Input type="date" {...register("dateIdentified")} />
            </FormField>

            {/* Identified By */}
            <FormField label="Identified By">
              <Input placeholder="Name / department" {...register("identifiedBy")} />
            </FormField>

            {/* Due Date for Assessment */}
            <FormField label="Due Date for Assessment">
              <Input type="date" {...register("dueDate")} />
            </FormField>

            {/* Description */}
            <FormField label="Risk Description" required error={errors.description?.message} className="sm:col-span-2">
              <RichTextEditor
                id="description"
                value={watch("description") ?? ""}
                minHeight={140}
                aria-invalid={!!errors.description}
                onChange={(v) => setValue("description", v, { shouldDirty: true, shouldValidate: true })}
              />
            </FormField>

            {/* Potential Impact */}
            <FormField label="Potential Impact / Effect" required error={errors.potentialImpact?.message} className="sm:col-span-2">
              <RichTextEditor
                id="potentialImpact"
                value={watch("potentialImpact") ?? ""}
                minHeight={120}
                aria-invalid={!!errors.potentialImpact}
                onChange={(v) => setValue("potentialImpact", v, { shouldDirty: true, shouldValidate: true })}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section B — Risk Context & Statement ── */}
        <Card>
          <CardHeader><CardTitle>B — Risk Context & Statement</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Scope / Context */}
            <FormField label="Scope / Context of Risk" className="sm:col-span-2">
              <RichTextEditor
                id="scope"
                value={watch("scope") ?? ""}
                minHeight={100}
                onChange={(v) => setValue("scope", v, { shouldDirty: true })}
              />
            </FormField>

            {/* Hazard / Failure Mode */}
            <FormField label="Hazard / Failure Mode" className="sm:col-span-2">
              <Input placeholder="e.g. Equipment failure, documentation error, contamination event…" {...register("hazard")} />
            </FormField>

            {/* Possible Cause */}
            <FormField label="Possible Cause" className="sm:col-span-2">
              <RichTextEditor
                id="possibleCause"
                value={watch("possibleCause") ?? ""}
                minHeight={100}
                onChange={(v) => setValue("possibleCause", v, { shouldDirty: true })}
              />
            </FormField>

            {/* Possible Effect */}
            <FormField label="Possible Effect / Impact" className="sm:col-span-2">
              <RichTextEditor
                id="possibleEffect"
                value={watch("possibleEffect") ?? ""}
                minHeight={100}
                onChange={(v) => setValue("possibleEffect", v, { shouldDirty: true })}
              />
            </FormField>

            {/* Existing Controls */}
            <FormField label="Existing Controls" className="sm:col-span-2">
              <RichTextEditor
                id="existingControls"
                value={watch("existingControls") ?? ""}
                minHeight={100}
                onChange={(v) => setValue("existingControls", v, { shouldDirty: true })}
              />
            </FormField>

            {/* Control Gaps */}
            <FormField label="Control Gaps" className="sm:col-span-2">
              <RichTextEditor
                id="controlGaps"
                value={watch("controlGaps") ?? ""}
                minHeight={100}
                onChange={(v) => setValue("controlGaps", v, { shouldDirty: true })}
              />
            </FormField>

            {/* Affected Products */}
            <FormField label="Affected Products">
              <Input placeholder="Product names or batch numbers" {...register("affectedProducts")} />
            </FormField>

            {/* Affected Processes */}
            <FormField label="Affected Processes">
              <Input placeholder="Process names or steps" {...register("affectedProcesses")} />
            </FormField>

            {/* Impact checkboxes */}
            <FormField label="Impact Flags" className="sm:col-span-2">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Customer Impact", val: customerImpact, set: setCustomerImpact },
                  { label: "Regulatory Impact", val: regulatoryImpact, set: setRegulatoryImpact },
                  { label: "Patient / User Impact", val: patientImpact, set: setPatientImpact },
                  { label: "Data Integrity Impact", val: dataIntegrityImpact, set: setDataIntegrityImpact },
                ].map(({ label, val, set }) => (
                  <label
                    key={label}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors",
                      val ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border bg-background hover:bg-accent/30"
                    )}
                  >
                    <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section C — Initial Classification ── */}
        <Card>
          <CardHeader><CardTitle>C — Initial Classification</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Criticality */}
            <FormField label="Criticality">
              <Controller
                control={control}
                name="criticality"
                render={({ field }) => (
                  <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    <option value="CRITICAL">Critical</option>
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                  </Select>
                )}
              />
            </FormField>

            {/* Initial Status — always IDENTIFIED from backend */}
            <FormField label="Initial Status">
              <Select defaultValue="IDENTIFIED" disabled className="bg-muted/40">
                <option value="IDENTIFIED">Identified</option>
              </Select>
            </FormField>

            {/* Required actions flags */}
            <FormField label="Required Actions" className="sm:col-span-2">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Requires CAPA", val: requiresCapa, set: setRequiresCapa },
                  { label: "Requires QA Approval", val: requiresQaApproval, set: setRequiresQaApproval },
                  { label: "Requires Management Escalation", val: requiresEscalation, set: setRequiresEscalation },
                  { label: "Requires Change Control", val: requiresChangeControl, set: setRequiresChangeControl },
                ].map(({ label, val, set }) => (
                  <label
                    key={label}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors",
                      val ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border bg-background hover:bg-accent/30"
                    )}
                  >
                    <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>

            <p className="text-label text-muted-foreground sm:col-span-2">
              Classification flags are recorded for tracking purposes and guide the review process. The formal risk assessment and scoring will be completed in the next step.
            </p>
          </CardContent>
        </Card>

        {/* ── Sticky action bar ── */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <Button type="button" variant="outline" disabled={create.isPending}>
            Save as Draft
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary text-white hover:bg-brand-primary/90"
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Create & Start Assessment"}
          </Button>
          <Button asChild variant="ghost" disabled={create.isPending}>
            <Link href="/risks">Cancel</Link>
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
