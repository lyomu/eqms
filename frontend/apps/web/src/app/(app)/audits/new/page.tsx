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
import { useCreateAudit } from "@/hooks/useAudit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  auditTitle: z.string().trim().min(1, "Audit title is required"),
  auditType: z.string().min(1, "Audit type is required"),
  auditCategory: z.string().optional(),
  objective: z.string().trim().min(1, "Audit objective is required"),
  scope: z.string().trim().min(1, "Audit scope is required"),
  criteria: z.string().trim().min(1, "Audit criteria is required"),
  department: z.string().optional(),
  processArea: z.string().optional(),
  site: z.string().optional(),
  relatedModule: z.string().optional(),
  riskLevel: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  method: z.string().optional(),
  frequency: z.string().optional(),
  reasonForAudit: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const AUDIT_TYPES = [
  { value: "INTERNAL_QMS", label: "Internal QMS Audit" },
  { value: "PROCESS", label: "Process Audit" },
  { value: "PRODUCT", label: "Product Audit" },
  { value: "SUPPLIER_AUDIT", label: "Supplier Audit" },
  { value: "EQUIPMENT_AUDIT", label: "Equipment Audit" },
  { value: "LABORATORY", label: "Laboratory Audit" },
  { value: "WAREHOUSE", label: "Warehouse Audit" },
  { value: "DOCUMENT_CONTROL", label: "Document Control Audit" },
  { value: "TRAINING_AUDIT", label: "Training Audit" },
  { value: "DATA_INTEGRITY", label: "Data Integrity Audit" },
  { value: "REGULATORY_INSPECTION", label: "Regulatory Inspection" },
  { value: "CERTIFICATION", label: "Certification Audit" },
  { value: "CUSTOMER", label: "Customer Audit" },
  { value: "EXTERNAL", label: "External Audit" },
  { value: "MOCK", label: "Mock Audit" },
  { value: "OTHER", label: "Other" },
];

const AUDIT_CATEGORIES = [
  "Internal",
  "External",
  "Supplier",
  "Regulatory",
  "Customer",
  "Certification",
  "Mock",
];

const RISK_LEVELS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const RELATED_MODULES = [
  { value: "SUPPLIER", label: "Supplier" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "DOCUMENT", label: "Document Control" },
  { value: "TRAINING", label: "Training" },
  { value: "CAPA", label: "CAPA" },
  { value: "DEVIATION", label: "Deviation" },
  { value: "RISK", label: "Risk Management" },
  { value: "CHANGE_CONTROL", label: "Change Control" },
  { value: "MATERIALS", label: "Materials" },
  { value: "PRODUCT", label: "Product" },
  { value: "BATCH_RECORD", label: "Batch Record" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "GENERAL", label: "General" },
];

const METHODS = [
  { value: "ON_SITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "DESKTOP_REVIEW", label: "Desktop Review" },
];

const FREQUENCIES = [
  { value: "ONE_TIME", label: "One-Time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUAL", label: "Semi-Annual" },
  { value: "ANNUAL", label: "Annual" },
  { value: "CUSTOM", label: "Custom" },
];

const REASONS = [
  { value: "SCHEDULED_PROGRAMME", label: "Scheduled Programme" },
  { value: "RISK_BASED", label: "Risk-Based Audit" },
  { value: "FOLLOW_UP", label: "Follow-up Audit" },
  { value: "SUPPLIER_QUALIFICATION", label: "Supplier Qualification" },
  { value: "COMPLAINT_TRIGGER", label: "Complaint Trigger" },
  { value: "DEVIATION_TRIGGER", label: "Deviation Trigger" },
  { value: "CAPA_FOLLOW_UP", label: "CAPA Follow-up" },
  { value: "REGULATORY_REQUIREMENT", label: "Regulatory Requirement" },
  { value: "MANAGEMENT_REQUEST", label: "Management Request" },
  { value: "OTHER", label: "Other" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewAuditPage() {
  const router = useRouter();
  const create = useCreateAudit();
  const [serverError, setServerError] = useState<string | null>(null);

  // Boolean flags for Section C (not in react-hook-form)
  const [checklistRequired, setChecklistRequired] = useState(true);
  const [openingMeetingRequired, setOpeningMeetingRequired] = useState(true);
  const [closingMeetingRequired, setClosingMeetingRequired] = useState(true);
  const [auditorIndependenceConfirmed, setAuditorIndependenceConfirmed] = useState(false);
  const [auditeeNotificationRequired, setAuditeeNotificationRequired] = useState(false);
  const [documentReviewRequired, setDocumentReviewRequired] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const busy = create.isPending;

  async function onSubmit(values: FormValues, _intent: "draft" | "submit") {
    setServerError(null);
    try {
      const a = await create.mutateAsync({
        auditTitle: values.auditTitle,
        auditType: values.auditType,
        auditCategory: values.auditCategory || null,
        objective: values.objective || null,
        scope: values.scope || null,
        criteria: values.criteria || null,
        department: values.department || null,
        processArea: values.processArea || null,
        site: values.site || null,
        relatedModule: values.relatedModule || null,
        riskLevel: values.riskLevel || null,
        plannedStartDate: values.plannedStartDate || null,
        plannedEndDate: values.plannedEndDate || null,
        method: values.method || null,
        frequency: values.frequency || null,
        reasonForAudit: values.reasonForAudit || null,
        checklistRequired,
        openingMeetingRequired,
        closingMeetingRequired,
        auditorIndependenceConfirmed,
      });
      toast.success("Audit created");
      router.push(`/audits/${a.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the audit. Please try again.");
    }
  }

  return (
    <div className="flex flex-col space-y-4 pb-24">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/audits"><ArrowLeft className="h-4 w-4" /> Go Back</Link>
        </Button>
        <span className="rounded-full bg-brand-primary px-3 py-1 text-label font-semibold text-white">New Audit</span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/audits">Audit Register</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create audit" message={serverError} />}

      <form noValidate className="space-y-4">
        {/* ── Section A — Basic Audit Details ── */}
        <Card>
          <CardHeader><CardTitle>A — Basic Audit Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Audit ID */}
            <FormField label="Audit ID" className="sm:col-span-2">
              <Input value="Auto-generated on save" readOnly className="bg-muted/40 text-muted-foreground" />
            </FormField>

            {/* Audit Title */}
            <FormField label="Audit Title" required error={errors.auditTitle?.message} className="sm:col-span-2">
              <Input placeholder="Enter a clear, concise audit title" aria-invalid={!!errors.auditTitle} {...register("auditTitle")} />
            </FormField>

            {/* Audit Type | Audit Category */}
            <FormField label="Audit Type" required error={errors.auditType?.message}>
              <Controller
                control={control}
                name="auditType"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select type…</option>
                    {AUDIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Audit Category">
              <Controller
                control={control}
                name="auditCategory"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select category…</option>
                    {AUDIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                )}
              />
            </FormField>

            {/* Objective */}
            <FormField label="Audit Objective" required error={errors.objective?.message} className="sm:col-span-2">
              <Textarea rows={3} placeholder="State the purpose and goals of this audit" aria-invalid={!!errors.objective} {...register("objective")} />
            </FormField>

            {/* Scope */}
            <FormField label="Audit Scope" required error={errors.scope?.message} className="sm:col-span-2">
              <Textarea rows={3} placeholder="Define what is included and excluded from this audit" aria-invalid={!!errors.scope} {...register("scope")} />
            </FormField>

            {/* Criteria */}
            <FormField label="Audit Criteria" required error={errors.criteria?.message} className="sm:col-span-2">
              <Textarea rows={2} placeholder="Standards, regulations, or procedures against which this audit will be conducted" aria-invalid={!!errors.criteria} {...register("criteria")} />
            </FormField>

            {/* Department | Process Area | Site */}
            <FormField label="Department / Area">
              <Input placeholder="e.g. QC Laboratory, Manufacturing" {...register("department")} />
            </FormField>

            <FormField label="Process Area">
              <Input placeholder="e.g. Batch Release, Cleaning Validation" {...register("processArea")} />
            </FormField>

            <FormField label="Site / Location">
              <Input placeholder="e.g. Site A, Building 2" {...register("site")} />
            </FormField>

            {/* Risk Level | Related Module */}
            <FormField label="Risk Level">
              <Controller
                control={control}
                name="riskLevel"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select risk level…</option>
                    {RISK_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                )}
              />
            </FormField>

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
          </CardContent>
        </Card>

        {/* ── Section B — Audit Planning ── */}
        <Card>
          <CardHeader><CardTitle>B — Audit Planning</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Planned Start Date | Planned End Date */}
            <FormField label="Planned Start Date">
              <Input type="date" {...register("plannedStartDate")} />
            </FormField>

            <FormField label="Planned End Date">
              <Input type="date" {...register("plannedEndDate")} />
            </FormField>

            {/* Method */}
            <FormField label="Audit Method">
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select method…</option>
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                )}
              />
            </FormField>

            {/* Frequency */}
            <FormField label="Frequency">
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select frequency…</option>
                    {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                )}
              />
            </FormField>

            {/* Reason for Audit */}
            <FormField label="Reason for Audit" className="sm:col-span-2">
              <Controller
                control={control}
                name="reasonForAudit"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">Select reason…</option>
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                )}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section C — Initial Setup ── */}
        <Card>
          <CardHeader><CardTitle>C — Initial Setup</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <FormField label="Audit Configuration">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Checklist Required?", val: checklistRequired, set: setChecklistRequired },
                  { label: "Opening Meeting Required?", val: openingMeetingRequired, set: setOpeningMeetingRequired },
                  { label: "Closing Meeting Required?", val: closingMeetingRequired, set: setClosingMeetingRequired },
                  { label: "Auditor Independence Confirmed?", val: auditorIndependenceConfirmed, set: setAuditorIndependenceConfirmed },
                  { label: "Auditee Notification Required?", val: auditeeNotificationRequired, set: setAuditeeNotificationRequired },
                  { label: "Document Review Required?", val: documentReviewRequired, set: setDocumentReviewRequired },
                ].map(({ label, val, set }) => (
                  <label key={label} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body transition-colors", val ? "border-brand-primary bg-brand-light text-brand-primary" : "border-border bg-background hover:bg-accent/30")}>
                    <input type="checkbox" checked={val} onChange={() => set(!val)} className="h-4 w-4 accent-brand-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </FormField>

            {/* Initial Status */}
            <FormField label="Initial Status">
              <Select disabled defaultValue="DRAFT" className="bg-muted/40">
                <option value="DRAFT">Draft (Save as Draft)</option>
                <option value="PLANNED">Planned (Create &amp; Start Planning)</option>
              </Select>
            </FormField>

            <p className="text-label text-muted-foreground">
              Auditor assignment, evidence collection, findings, and QA approval will be completed in subsequent workflow stages. Submission records a 21 CFR Part 11–compliant audit entry.
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
            {busy ? "Creating…" : "Create & Start Planning"}
          </Button>
          <Button asChild variant="ghost" disabled={busy}>
            <Link href="/audits">Cancel</Link>
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
