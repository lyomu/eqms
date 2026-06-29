"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useProduct, useUpdateProduct } from "@/hooks/useProduct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { PRODUCT_CRITICALITY_LABELS, PRODUCT_TYPE_LABELS, type ProductCriticality } from "@/types/product";

const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS);
const CRITICALITIES = Object.keys(PRODUCT_CRITICALITY_LABELS) as ProductCriticality[];

interface FormValues {
  name: string;
  productType: string;
  category: string;
  strength: string;
  description: string;
  intendedUse: string;
  criticality: ProductCriticality;
  ownerId: string;
  department: string;
  siteLocation: string;
  revision: string;
  specificationReference: string;
  storageRequirements: string;
  shelfLife: string;
  expiryRequired: boolean;
  qcTestingRequired: boolean;
  batchLotTrackingRequired: boolean;
  regulatoryCustomerRequirements: string;
  notes: string;
  reason: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const product = useProduct(id);
  const update = useUpdateProduct();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>();
  const { register, control, handleSubmit, reset } = form;

  useEffect(() => {
    if (product.data) {
      const p = product.data;
      reset({
        name: p.name,
        productType: p.productType ?? "OTHER",
        category: p.category ?? "",
        strength: p.strength ?? "",
        description: p.description ?? "",
        intendedUse: p.intendedUse ?? "",
        criticality: p.criticality,
        ownerId: p.ownerId ? String(p.ownerId) : "",
        department: p.department ?? "",
        siteLocation: p.siteLocation ?? "",
        revision: p.revision ?? "A",
        specificationReference: p.specificationReference ?? "",
        storageRequirements: p.storageRequirements ?? "",
        shelfLife: p.shelfLife ?? "",
        expiryRequired: p.expiryRequired,
        qcTestingRequired: p.qcTestingRequired,
        batchLotTrackingRequired: p.batchLotTrackingRequired,
        regulatoryCustomerRequirements: p.regulatoryCustomerRequirements ?? "",
        notes: p.notes ?? "",
        reason: "",
      });
    }
  }, [product.data, reset]);

  if (product.isLoading) return <LoadingScreen label="Loading product..." />;
  if (product.isError || !product.data) return <ErrorAlert title="Error" message="Failed to load this product." />;
  const p = product.data;

  if (p.status !== "DRAFT") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-h3 text-brand-primary">Product is locked</p>
            <p className="text-body text-muted-foreground">
              {p.productCode} is {p.status.replace(/_/g, " ").toLowerCase()} and can only be edited while in Draft.
            </p>
            <Button asChild><Link href={`/products/${id}`}>Back to product</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await update.mutateAsync({
        id,
        expectedVersion: p.version,
        name: values.name,
        productType: values.productType,
        category: values.category || null,
        strength: values.strength || null,
        description: values.description || null,
        intendedUse: values.intendedUse || null,
        criticality: values.criticality,
        ownerId: values.ownerId ? Number(values.ownerId) : null,
        department: values.department || null,
        siteLocation: values.siteLocation || null,
        revision: values.revision || "A",
        specificationReference: values.specificationReference || null,
        storageRequirements: values.storageRequirements || null,
        shelfLife: values.shelfLife || null,
        expiryRequired: values.expiryRequired,
        qcTestingRequired: values.qcTestingRequired,
        batchLotTrackingRequired: values.batchLotTrackingRequired,
        regulatoryCustomerRequirements: values.regulatoryCustomerRequirements || null,
        notes: values.notes || null,
        registrationNumber: values.specificationReference || null,
        reason: values.reason || undefined,
      });
      toast.success("Product saved");
      router.push(`/products/${id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      if (ax.response?.status === 409) setServerError("This product was changed elsewhere. Reload and try again.");
      else if (ax.response?.status === 422) setServerError("This product can no longer be edited directly.");
      else setServerError(ax.response?.data?.message ?? "Could not save changes. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">Edit {p.productCode}</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href={`/products/${id}`}>Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Edit product draft</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Product Name"><Input {...register("name")} /></Field>
              <Field label="Product Type"><Select {...register("productType")}>{PRODUCT_TYPES.map((t) => <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>)}</Select></Field>
              <Field label="Category"><Input {...register("category")} /></Field>
              <Field label="Product Owner"><Input type="number" {...register("ownerId")} /></Field>
              <Field label="Department"><Input {...register("department")} /></Field>
              <Field label="Site/Location"><Input {...register("siteLocation")} /></Field>
              <Field label="Version/Revision"><Input {...register("revision")} /></Field>
              <Field label="Specification Reference"><Input {...register("specificationReference")} /></Field>
              <Field label="Shelf Life"><Input {...register("shelfLife")} /></Field>
              <Field label="Strength / Presentation"><Input {...register("strength")} /></Field>
              <Field label="Criticality"><Select {...register("criticality")}>{CRITICALITIES.map((c) => <option key={c} value={c}>{PRODUCT_CRITICALITY_LABELS[c]}</option>)}</Select></Field>
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

            <Field label="Reason for change (audit trail)"><Input {...register("reason")} placeholder="e.g. Updated specification reference" /></Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href={`/products/${id}`}>Cancel</Link></Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
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
