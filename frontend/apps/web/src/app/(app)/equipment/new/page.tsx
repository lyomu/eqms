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
import { useCreateEquipment } from "@/hooks/useEquipment";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { EQUIPMENT_TYPES, equipmentTypeLabel, type EquipmentType } from "@/types/equipment";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  equipmentName: z.string().trim().min(1, "Name is required"),
  equipmentType: z.enum(EQUIPMENT_TYPES as [EquipmentType, ...EquipmentType[]]),
  manufacturer: z.string().trim().min(1, "Manufacturer is required"),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  assetTag: z.string().optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  room: z.string().optional(),
  acquisitionDate: z.string().optional(),
  installationDate: z.string().optional(),
  warrantyExpiryDate: z.string().optional(),
  calibrationFrequencyMonths: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) > 0, "Must be a positive number"),
  category: z.string().default("MAJOR"),
  criticality: z.string().default("NON_CRITICAL"),
  intendedUse: z.string().optional(),
  usageRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Document checklist ──────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  "Installation Qualification (IQ) Protocol",
  "Operational Qualification (OQ) Protocol",
  "Performance Qualification (PQ) Protocol",
  "Calibration Procedure / SOP",
  "Maintenance SOP",
  "Cleaning SOP",
  "Operator Manual",
  "Calibration Certificate",
  "Vendor / Supplier GMP Certificate",
  "Equipment Logbook",
  "Risk Assessment",
  "Site Acceptance Test (SAT) Report",
  "Other Documents",
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewEquipmentPage() {
  const router = useRouter();
  const create = useCreateEquipment();
  const users = useUsers();

  const [serverError, setServerError] = useState<string | null>(null);
  const [calibrationRequired, setCalibrationRequired] = useState(true);
  const [maintenanceRequired, setMaintenanceRequired] = useState(true);
  const [qualificationRequired, setQualificationRequired] = useState(true);
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      equipmentType: "BALANCE",
      category: "MAJOR",
      criticality: "NON_CRITICAL",
    },
  });

  function toggleDoc(item: string) {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const e = await create.mutateAsync({
        equipmentName: values.equipmentName,
        equipmentType: values.equipmentType,
        manufacturer: values.manufacturer,
        model: values.model || null,
        serialNumber: values.serialNumber || null,
        location: values.location || null,
        acquisitionDate: values.acquisitionDate || null,
        calibrationFrequencyMonths: values.calibrationFrequencyMonths
          ? Number(values.calibrationFrequencyMonths)
          : null,
      });
      toast.success("Equipment created successfully");
      router.push(`/equipment/${e.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(
        ax.response?.data?.message ?? "Could not create the equipment. Please try again."
      );
    }
  }

  return (
    <div className="flex flex-col space-y-4 pb-24">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/equipment">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Link>
        </Button>
        <span className="rounded-full bg-brand-primary px-3 py-1 text-label font-semibold text-white">
          New Equipment
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/equipment">All Equipment</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create equipment" message={serverError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* ── Section A — Basic Details ── */}
        <Card>
          <CardHeader>
            <CardTitle>A — Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Equipment Code */}
            <FormField label="Equipment Code" className="sm:col-span-2">
              <Input
                value="Auto-generated on save"
                readOnly
                className="bg-muted/40 text-muted-foreground"
              />
            </FormField>

            {/* Name */}
            <FormField label="Equipment Name" required error={errors.equipmentName?.message}>
              <Input
                placeholder="e.g. Analytical Balance AB-1"
                aria-invalid={!!errors.equipmentName}
                {...register("equipmentName")}
              />
            </FormField>

            {/* Type */}
            <FormField label="Equipment Type" required error={errors.equipmentType?.message}>
              <Controller
                control={control}
                name="equipmentType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    aria-invalid={!!errors.equipmentType}
                  >
                    {EQUIPMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{equipmentTypeLabel(t)}</option>
                    ))}
                  </Select>
                )}
              />
            </FormField>

            {/* Category */}
            <FormField label="Category">
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    <option value="CRITICAL">Critical</option>
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                  </Select>
                )}
              />
            </FormField>

            {/* Criticality */}
            <FormField label="Criticality">
              <Controller
                control={control}
                name="criticality"
                render={({ field }) => (
                  <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    <option value="CRITICAL">Critical</option>
                    <option value="NON_CRITICAL">Non-Critical</option>
                  </Select>
                )}
              />
            </FormField>

            {/* Manufacturer */}
            <FormField label="Manufacturer" required error={errors.manufacturer?.message}>
              <Input
                placeholder="e.g. Mettler Toledo"
                aria-invalid={!!errors.manufacturer}
                {...register("manufacturer")}
              />
            </FormField>

            {/* Model */}
            <FormField label="Model">
              <Input placeholder="e.g. XPR205" {...register("model")} />
            </FormField>

            {/* Serial Number */}
            <FormField label="Serial Number">
              <Input placeholder="e.g. SN-123456" {...register("serialNumber")} />
            </FormField>

            {/* Asset Tag */}
            <FormField label="Asset Tag">
              <Input placeholder="e.g. AST-0042" {...register("assetTag")} />
            </FormField>

            {/* Department */}
            <FormField label="Department">
              <Input placeholder="e.g. QC Laboratory" {...register("department")} />
            </FormField>

            {/* Location */}
            <FormField label="Location">
              <Input placeholder="e.g. Lab 2 — Building A" {...register("location")} />
            </FormField>

            {/* Room */}
            <FormField label="Room / Area">
              <Input placeholder="e.g. Room 101" {...register("room")} />
            </FormField>

            {/* Acquisition Date */}
            <FormField label="Acquisition Date">
              <Input type="date" {...register("acquisitionDate")} />
            </FormField>

            {/* Installation Date */}
            <FormField label="Installation Date">
              <Input type="date" {...register("installationDate")} />
            </FormField>

            {/* Warranty Expiry */}
            <FormField label="Warranty Expiry Date">
              <Input type="date" {...register("warrantyExpiryDate")} />
            </FormField>

            {/* Cal Frequency */}
            <FormField
              label="Calibration Frequency (months)"
              error={errors.calibrationFrequencyMonths?.message}
            >
              <Input
                inputMode="numeric"
                placeholder="e.g. 12"
                aria-invalid={!!errors.calibrationFrequencyMonths}
                {...register("calibrationFrequencyMonths")}
              />
            </FormField>

            {/* Owner — UI only */}
            <FormField label="Equipment Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.fullName}</option>
                ))}
              </Select>
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section B — QA Control ── */}
        <Card>
          <CardHeader>
            <CardTitle>B — QA Control</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Calibration Required */}
            <FormField label="Calibration Required?" className="sm:col-span-2">
              <div className="flex items-center gap-6">
                <RadioOpt
                  label="Yes"
                  checked={calibrationRequired}
                  onChange={() => setCalibrationRequired(true)}
                />
                <RadioOpt
                  label="No"
                  checked={!calibrationRequired}
                  onChange={() => setCalibrationRequired(false)}
                />
              </div>
            </FormField>

            {/* Maintenance Required */}
            <FormField label="Maintenance Required?" className="sm:col-span-2">
              <div className="flex items-center gap-6">
                <RadioOpt
                  label="Yes"
                  checked={maintenanceRequired}
                  onChange={() => setMaintenanceRequired(true)}
                />
                <RadioOpt
                  label="No"
                  checked={!maintenanceRequired}
                  onChange={() => setMaintenanceRequired(false)}
                />
              </div>
            </FormField>

            {/* Qualification Required */}
            <FormField label="Qualification Required?" className="sm:col-span-2">
              <div className="flex items-center gap-6">
                <RadioOpt
                  label="Yes"
                  checked={qualificationRequired}
                  onChange={() => setQualificationRequired(true)}
                />
                <RadioOpt
                  label="No"
                  checked={!qualificationRequired}
                  onChange={() => setQualificationRequired(false)}
                />
              </div>
            </FormField>

            {/* Initial Status */}
            <FormField label="Initial Status">
              <Select defaultValue="REGISTERED">
                <option value="REGISTERED">Registered</option>
                <option value="IN_CALIBRATION">In Calibration</option>
              </Select>
            </FormField>

            {/* QA Owner */}
            <FormField label="QA Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.fullName}</option>
                ))}
              </Select>
            </FormField>

            {/* Maintenance Owner */}
            <FormField label="Maintenance Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.fullName}</option>
                ))}
              </Select>
            </FormField>

            {/* Intended Use */}
            <FormField label="Intended Use" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Describe the intended use of this equipment…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                {...register("intendedUse")}
              />
            </FormField>

            {/* Usage Restrictions */}
            <FormField label="Usage Restrictions" className="sm:col-span-2">
              <textarea
                rows={2}
                placeholder="Any usage restrictions or special conditions…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                {...register("usageRestrictions")}
              />
            </FormField>

            {/* Notes */}
            <FormField label="Notes" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Additional notes…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                {...register("notes")}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section C — Initial Documents Checklist ── */}
        <Card>
          <CardHeader>
            <CardTitle>C — Documents Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {CHECKLIST_ITEMS.map((item) => (
                <label
                  key={item}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-body transition-colors",
                    checkedDocs.has(item)
                      ? "border-brand-primary bg-brand-light text-brand-primary"
                      : "border-border bg-background hover:bg-accent/30"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checkedDocs.has(item)}
                    onChange={() => toggleDoc(item)}
                    className="h-4 w-4 accent-brand-primary"
                  />
                  {item}
                </label>
              ))}
            </div>
            <p className="text-label text-muted-foreground">
              Selected items will be tracked as required in the Documents tab after creation.
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
            {create.isPending ? "Creating…" : "Create Equipment"}
          </Button>
          <Button asChild variant="ghost" disabled={create.isPending}>
            <Link href="/equipment">Cancel</Link>
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

function RadioOpt({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-body">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-brand-primary"
      />
      {label}
    </label>
  );
}
