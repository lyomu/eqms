"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { DOSAGE_FORM_LABELS, type DosageForm } from "@/types/product";

const FORMS = Object.keys(DOSAGE_FORM_LABELS) as DosageForm[];

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  dosageForm: z.enum(["TABLET", "CAPSULE", "INJECTION", "SYRUP", "CREAM", "OINTMENT", "INHALER", "OTHER"]),
  strength: z.string().optional(),
  description: z.string().optional(),
  registrationNumber: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateProductPage() {
  const router = useRouter();
  const create = useCreateProduct();
  const transition = useProductTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dosageForm: "TABLET" },
  });

  const busy = create.isPending || transition.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "approval") {
    setServerError(null);
    try {
      const p = await create.mutateAsync({
        name: values.name,
        dosageForm: values.dosageForm,
        strength: values.strength || null,
        description: values.description || null,
        registrationNumber: values.registrationNumber || null,
      });
      if (intent === "approval") {
        await transition.mutateAsync({ id: p.id, action: "submit-for-approval", expectedVersion: p.version, reason: "Submitted for approval" });
      }
      toast.success("Product created");
      router.push(`/products/${p.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the product. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Product</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/products">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Product details</CardTitle></CardHeader>
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
                <Label htmlFor="dosageForm">Dosage form *</Label>
                <Select id="dosageForm" {...register("dosageForm")}>
                  {FORMS.map((f) => <option key={f} value={f}>{DOSAGE_FORM_LABELS[f]}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="strength">Strength</Label>
                <Input id="strength" placeholder="e.g. 500 mg" {...register("strength")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="registrationNumber">Registration number</Label>
              <Input id="registrationNumber" {...register("registrationNumber")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...register("description")} />
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
