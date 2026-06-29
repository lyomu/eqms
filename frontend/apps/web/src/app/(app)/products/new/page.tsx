"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateProduct, useProductTransition } from "@/hooks/useProduct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PRODUCT_CRITICALITY_LABELS, PRODUCT_TYPE_LABELS, type ProductCriticality } from "@/types/product";

const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS);
const CRITICALITIES = Object.keys(PRODUCT_CRITICALITY_LABELS) as ProductCriticality[];

const schema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  productType: z.string().min(1, "Product type is required"),
  category: z.string().optional(),
  strength: z.string().optional(),
  description: z.string().optional(),
  intendedUse: z.string().optional(),
  criticality: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
  ownerId: z.coerce.number().optional(),
  department: z.string().optional(),
  siteLocation: z.string().optional(),
  revision: z.string().optional(),
  specificationReference: z.string().trim().min(1, "Specification reference is required"),
  storageRequirements: z.string().optional(),
  shelfLife: z.string().optional(),
  expiryRequired: z.boolean().default(false),
  qcTestingRequired: z.boolean().default(false),
  batchLotTrackingRequired: z.boolean().default(false),
  regulatoryCustomerRequirements: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateProductPage() {
  const router = useRouter();
  const create = useCreateProduct();
  const transition = useProductTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productType: "FINISHED_PRODUCT",
      criticality: "MINOR",
      revision: "A",
      expiryRequired: false,
      qcTestingRequired: true,
      batchLotTrackingRequired: true,
    },
  });

  const busy = create.isPending || transition.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "approval") {
    setServerError(null);
    try {
      const p = await create.mutateAsync({
        name: values.name,
        dosageForm: "OTHER",
        productType: values.productType,
        category: values.category || null,
        strength: values.strength || null,
        description: values.description || null,
        intendedUse: values.intendedUse || null,
        criticality: values.criticality,
        ownerId: values.ownerId || null,
        department: values.department || null,
        siteLocation: values.siteLocation || null,
        revision: values.revision || "A",
        specificationReference: values.specificationReference,
        storageRequirements: values.storageRequirements || null,
        shelfLife: values.shelfLife || null,
        expiryRequired: values.expiryRequired,
        qcTestingRequired: values.qcTestingRequired,
        batchLotTrackingRequired: values.batchLotTrackingRequired,
        regulatoryCustomerRequirements: values.regulatoryCustomerRequirements || null,
        notes: values.notes || null,
        registrationNumber: values.specificationReference,
      });
      if (intent === "approval") {
        await transition.mutateAsync({ id: p.id, action: "submit", expectedVersion: p.version, reason: "Submitted for review" });
      }
      toast.success("Product created");
      router.push(`/products/${p.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the product. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Product</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/products">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Product master data</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-5" noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Product Name *" error={errors.name?.message}><Input {...register("name")} /></Field>
              <Field label="Product Type *" error={errors.productType?.message}>
                <Select {...register("productType")}>{PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}</Select>
              </Field>
              <Field label="Category"><Input {...register("category")} /></Field>
              <Field label="Product Owner"><Input type="number" {...register("ownerId")} /></Field>
              <Field label="Department"><Input {...register("department")} /></Field>
              <Field label="Site/Location"><Input {...register("siteLocation")} /></Field>
              <Field label="Version/Revision"><Input {...register("revision")} /></Field>
              <Field label="Specification Reference *" error={errors.specificationReference?.message}><Input {...register("specificationReference")} /></Field>
              <Field label="Shelf Life"><Input {...register("shelfLife")} /></Field>
              <Field label="Strength / Presentation"><Input {...register("strength")} /></Field>
              <Field label="Criticality">
                <Select {...register("criticality")}>{CRITICALITIES.map((c) => <option key={c} value={c}>{PRODUCT_CRITICALITY_LABELS[c]}</option>)}</Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Checkbox label="Expiry Required" {...register("expiryRequired")} />
              <Checkbox label="QC Testing Required" {...register("qcTestingRequired")} />
              <Checkbox label="Batch/Lot Tracking Required" {...register("batchLotTrackingRequired")} />
            </div>

            <RichField name="description" label="Description" control={control} />
            <RichField name="intendedUse" label="Intended Use" control={control} />
            <RichField name="storageRequirements" label="Storage Requirements" control={control} />
            <RichField name="regulatoryCustomerRequirements" label="Regulatory/Customer Requirements" control={control} />
            <RichField name="notes" label="Notes" control={control} />

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "draft"))}>Save as Draft</Button>
              <Button type="button" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "approval"))}>{busy ? "Saving..." : "Submit for Review"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-label text-error">{error}</p>}
    </div>
  );
}

function RichField({ name, label, control }: { name: keyof FormValues; label: string; control: ReturnType<typeof useForm<FormValues>>["control"] }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Controller control={control} name={name} render={({ field }) => <RichTextEditor value={String(field.value ?? "")} onChange={field.onChange} minHeight={150} />} />
    </div>
  );
}

function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-body">
      <input type="checkbox" {...props} />
      {label}
    </label>
  );
}
