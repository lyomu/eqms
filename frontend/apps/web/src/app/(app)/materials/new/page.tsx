"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateMaterial, useMaterialTransition } from "@/hooks/useMaterial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { MATERIAL_TYPE_LABELS, UOM_LABELS, type MaterialType, type UnitOfMeasure } from "@/types/material";

const TYPES = Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[];
const UOMS = Object.keys(UOM_LABELS) as UnitOfMeasure[];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  materialType: z.enum(["RAW_MATERIAL", "ACTIVE_INGREDIENT", "EXCIPIENT", "PACKAGING", "INTERMEDIATE", "OTHER"]),
  unitOfMeasure: z.enum(["KG", "G", "MG", "L", "ML", "UNIT", "EACH"]),
  specification: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateMaterialPage() {
  const router = useRouter();
  const create = useCreateMaterial();
  const transition = useMaterialTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { materialType: "RAW_MATERIAL", unitOfMeasure: "KG" },
  });

  const busy = create.isPending || transition.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "approval") {
    setServerError(null);
    try {
      const m = await create.mutateAsync({
        name: values.name,
        materialType: values.materialType,
        unitOfMeasure: values.unitOfMeasure,
        specification: values.specification || null,
        description: values.description || null,
      });
      if (intent === "approval") {
        await transition.mutateAsync({ id: m.id, action: "submit-for-approval", expectedVersion: m.version, reason: "Submitted for approval" });
      }
      toast.success("Material created");
      router.push(`/materials/${m.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the material. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Material</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/materials">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Material details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-label text-error">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="materialType">Type *</Label>
                <Select id="materialType" {...register("materialType")}>
                  {TYPES.map((t) => <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitOfMeasure">Unit of measure *</Label>
                <Select id="unitOfMeasure" {...register("unitOfMeasure")}>
                  {UOMS.map((u) => <option key={u} value={u}>{UOM_LABELS[u]}</option>)}
                </Select>
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

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "draft"))}>Save as Draft</Button>
              <Button type="button" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "approval"))}>
                {busy ? "Saving…" : "Submit for Approval"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
