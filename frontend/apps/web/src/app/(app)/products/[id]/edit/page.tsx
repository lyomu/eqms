"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useProduct, useUpdateProduct } from "@/hooks/useProduct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { DOSAGE_FORM_LABELS } from "@/types/product";

interface FormValues {
  strength: string;
  registrationNumber: string;
  description: string;
  reason: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const product = useProduct(id);
  const update = useUpdateProduct();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (product.data) {
      reset({
        strength: product.data.strength ?? "",
        registrationNumber: product.data.registrationNumber ?? "",
        description: product.data.description ?? "",
        reason: "",
      });
    }
  }, [product.data, reset]);

  if (product.isLoading) return <LoadingScreen label="Loading product…" />;
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
        strength: values.strength || null,
        registrationNumber: values.registrationNumber || null,
        description: values.description || null,
        reason: values.reason || undefined,
      });
      toast.success("Product saved");
      router.push(`/products/${id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      if (ax.response?.status === 409) setServerError("This product was changed elsewhere. Reload and try again.");
      else if (ax.response?.status === 422) setServerError("This product can no longer be edited (not in Draft).");
      else setServerError(ax.response?.data?.message ?? "Could not save changes. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">Edit {p.productCode}</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href={`/products/${id}`}>Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Edit product (Draft)</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            {/* Name + dosage form are fixed after creation (backend update doesn't accept them). */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={p.name} readOnly disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Dosage form</Label>
                <Input value={DOSAGE_FORM_LABELS[p.dosageForm]} readOnly disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="strength">Strength</Label>
                <Input id="strength" {...register("strength")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registrationNumber">Registration number</Label>
                <Input id="registrationNumber" {...register("registrationNumber")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...register("description")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason for change (audit trail)</Label>
              <Input id="reason" placeholder="e.g. Updated strength" {...register("reason")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href={`/products/${id}`}>Cancel</Link></Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
