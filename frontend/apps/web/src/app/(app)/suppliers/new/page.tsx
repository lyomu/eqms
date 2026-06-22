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
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { useUsers } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { cn } from "@/lib/utils";
import { SUPPLIER_TYPE_LABELS, type SupplierType } from "@/types/supplier";

// ─── Schema (only fields the backend create endpoint accepts) ─────────────────

const schema = z.object({
  supplierName: z.string().trim().min(1, "Required"),
  supplierType: z.enum(["RAW_MATERIAL", "PACKAGING", "SERVICE"]),
  contactPerson: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().trim().min(1, "Required"),
  address: z.string().trim().min(1, "Required"),
  city: z.string().optional(),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  category: z.string().default("MAJOR"),
  criticality: z.string().default("NON_CRITICAL"),
});

type FormValues = z.infer<typeof schema>;

// ─── Document checklist items ─────────────────────────────────────────────────

const DOC_ITEMS = [
  "Company Profile",
  "Business Registration",
  "GMP Certificate",
  "ISO Certificate",
  "COA Sample",
  "MSDS / SDS",
  "Product Specification",
  "Quality Agreement",
  "Supplier Questionnaire",
  "Audit Report",
  "Contract / NDA",
  "Other",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewSupplierPage() {
  const router = useRouter();
  const create = useCreateSupplier();
  const users = useUsers();

  const [serverError, setServerError] = useState<string | null>(null);
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
      supplierType: "RAW_MATERIAL",
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
    const location = [values.address, values.city, values.country]
      .filter(Boolean)
      .join(", ");
    try {
      const supplier = await create.mutateAsync({
        supplierName: values.supplierName,
        supplierType: values.supplierType as SupplierType,
        contactPerson: values.contactPerson || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        location,
      });
      toast.success("Supplier created successfully");
      router.push(`/suppliers/${supplier.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(
        ax.response?.data?.message ?? "Could not create the supplier. Please try again."
      );
    }
  }

  return (
    <div className="flex flex-col space-y-4 pb-24">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>
        <span className="rounded-full bg-brand-primary px-3 py-1 text-label font-semibold text-white">
          New Supplier
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/suppliers">All Suppliers</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't create supplier" message={serverError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* ── Section A — Basic Details ── */}
        <Card>
          <CardHeader>
            <CardTitle>A — Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Supplier Code */}
            <FormField label="Supplier Code" className="sm:col-span-2">
              <Input
                value="Auto-generated on save"
                readOnly
                className="bg-muted/40 text-muted-foreground"
              />
            </FormField>

            {/* Supplier Name */}
            <FormField label="Supplier Name" required error={errors.supplierName?.message}>
              <Input
                placeholder="Enter supplier name"
                aria-invalid={!!errors.supplierName}
                {...register("supplierName")}
              />
            </FormField>

            {/* Supplier Type */}
            <FormField label="Supplier Type" required error={errors.supplierType?.message}>
              <Controller
                control={control}
                name="supplierType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    aria-invalid={!!errors.supplierType}
                  >
                    {(Object.keys(SUPPLIER_TYPE_LABELS) as SupplierType[]).map((t) => (
                      <option key={t} value={t}>
                        {SUPPLIER_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </FormField>

            {/* Category — UI only */}
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

            {/* Criticality — UI only */}
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

            {/* Contact Person */}
            <FormField label="Contact Person">
              <Input placeholder="Full name" {...register("contactPerson")} />
            </FormField>

            {/* Email */}
            <FormField label="Email" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="contact@supplier.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </FormField>

            {/* Phone */}
            <FormField label="Phone">
              <Input type="tel" placeholder="+1 555 000 0000" {...register("phone")} />
            </FormField>

            {/* Website — UI only */}
            <FormField label="Website">
              <Input type="url" placeholder="https://supplier.com" {...register("website")} />
            </FormField>

            {/* Country */}
            <FormField label="Country" required error={errors.country?.message}>
              <Input
                placeholder="e.g. United States"
                aria-invalid={!!errors.country}
                {...register("country")}
              />
            </FormField>

            {/* City / Region */}
            <FormField label="City / Region">
              <Input placeholder="e.g. New York, NY" {...register("city")} />
            </FormField>

            {/* Physical Address */}
            <FormField
              label="Physical Address"
              required
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <Input
                placeholder="Street address"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
            </FormField>

            {/* Tax / VAT Number — UI only */}
            <FormField label="Tax / VAT Number">
              <Input placeholder="VAT-000000" {...register("taxNumber")} />
            </FormField>

            {/* Company Registration Number — UI only */}
            <FormField label="Company Registration Number">
              <Input placeholder="REG-000000" {...register("registrationNumber")} />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section B — QA Onboarding ── */}
        <Card>
          <CardHeader>
            <CardTitle>B — QA Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Qualification Required */}
            <FormField label="Qualification Required?" className="sm:col-span-2">
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="qualificationRequired"
                    value="yes"
                    checked={qualificationRequired}
                    onChange={() => setQualificationRequired(true)}
                    className="h-4 w-4 accent-brand-primary"
                  />
                  Yes
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="qualificationRequired"
                    value="no"
                    checked={!qualificationRequired}
                    onChange={() => setQualificationRequired(false)}
                    className="h-4 w-4 accent-brand-primary"
                  />
                  No
                </label>
              </div>
            </FormField>

            {/* Initial Status — UI only */}
            <FormField label="Initial Status">
              <Select defaultValue="DRAFT">
                <option value="DRAFT">Draft</option>
                <option value="PENDING_DOCS">Pending Documents</option>
                <option value="PENDING_REVIEW">Pending QA Review</option>
              </Select>
            </FormField>

            {/* QA Owner — UI only */}
            <FormField label="QA Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Procurement Owner — UI only */}
            <FormField label="Procurement Owner">
              <Select defaultValue="">
                <option value="">Select user…</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Scope of Supply — UI only */}
            <FormField label="Scope of Supply" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Describe what this supplier provides…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            </FormField>

            {/* Reason for Qualification — UI only */}
            <FormField label="Reason for Qualification" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Why is this supplier being qualified?"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            </FormField>

            {/* Notes — UI only */}
            <FormField label="Notes" className="sm:col-span-2">
              <textarea
                rows={3}
                placeholder="Additional notes…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Section C — Required Documents Checklist ── */}
        <Card>
          <CardHeader>
            <CardTitle>C — Documents Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {DOC_ITEMS.map((item) => (
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

        {/* ── Sticky bottom action bar ── */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <Button type="button" variant="outline" disabled={create.isPending}>
            Save as Draft
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary text-white hover:bg-brand-primary/90"
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Create & Start Qualification"}
          </Button>
          <Button asChild variant="ghost" disabled={create.isPending}>
            <Link href="/suppliers">Cancel</Link>
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
