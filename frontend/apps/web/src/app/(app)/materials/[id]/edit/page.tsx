"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useMaterial, useUpdateMaterial } from "@/hooks/useMaterial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { MATERIAL_TYPE_LABELS, UOM_LABELS } from "@/types/material";

interface FormValues {
  specification: string;
  description: string;
  reason: string;
}

export default function EditMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const material = useMaterial(id);
  const update = useUpdateMaterial();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (material.data) {
      reset({
        specification: material.data.specification ?? "",
        description: material.data.description ?? "",
        reason: "",
      });
    }
  }, [material.data, reset]);

  if (material.isLoading) return <LoadingScreen label="Loading material…" />;
  if (material.isError || !material.data) return <ErrorAlert title="Error" message="Failed to load this material." />;
  const m = material.data;

  if (m.status !== "DRAFT") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-h3 text-brand-primary">Material is locked</p>
            <p className="text-body text-muted-foreground">
              {m.materialCode} is {m.status.replace(/_/g, " ").toLowerCase()} and can only be edited while in Draft.
            </p>
            <Button asChild><Link href={`/materials/${id}`}>Back to material</Link></Button>
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
        expectedVersion: m.version,
        specification: values.specification || null,
        description: values.description || null,
        reason: values.reason || undefined,
      });
      toast.success("Material saved");
      router.push(`/materials/${id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      if (ax.response?.status === 409) setServerError("This material was changed elsewhere. Reload and try again.");
      else if (ax.response?.status === 422) setServerError("This material can no longer be edited (not in Draft).");
      else setServerError(ax.response?.data?.message ?? "Could not save changes. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">Edit {m.materialCode}</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href={`/materials/${id}`}>Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Edit material (Draft)</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            {/* Name, type, UoM are fixed after creation (backend update doesn't accept them). */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={m.name} readOnly disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Input value={MATERIAL_TYPE_LABELS[m.materialType]} readOnly disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={UOM_LABELS[m.unitOfMeasure]} readOnly disabled />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specification">Specification</Label>
              <Textarea id="specification" rows={3} {...register("specification")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason for change (audit trail)</Label>
              <Input id="reason" placeholder="e.g. Updated specification" {...register("reason")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href={`/materials/${id}`}>Cancel</Link></Button>
              <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
