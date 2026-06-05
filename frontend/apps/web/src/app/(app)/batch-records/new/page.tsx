"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateBatch } from "@/hooks/useBatch";
import { useProductList } from "@/hooks/useProduct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

const schema = z.object({
  productId: z.string().min(1, "Product is required"),
  batchSize: z.string().refine((v) => Number(v) > 0, "Batch size must be greater than 0"),
  unit: z.string().trim().min(1, "Unit is required"),
  manufacturingStartDate: z.string().min(1, "Start date is required"),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateBatchPage() {
  const router = useRouter();
  const create = useCreateBatch();
  // Active products are the manufacturable ones; pull a generous page for the picker.
  const products = useProductList({ status: "ACTIVE", size: 100 });
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { unit: "units" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const product = products.data?.content.find((p) => String(p.id) === values.productId);
    if (!product) {
      setServerError("Please select a valid product.");
      return;
    }
    try {
      const batch = await create.mutateAsync({
        productId: product.id,
        productCode: product.productCode,
        batchSize: Number(values.batchSize),
        unit: values.unit,
        manufacturingStartDate: new Date(values.manufacturingStartDate).toISOString(),
        notes: values.notes || null,
      });
      toast.success("Batch record created");
      router.push(`/batch-records/${batch.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the batch record. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Batch Record</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/batch-records">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Batch details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

            <div className="space-y-1.5">
              <Label htmlFor="productId">Product *</Label>
              <Select id="productId" aria-invalid={!!errors.productId} {...register("productId")}>
                <option value="">Select a product…</option>
                {products.data?.content.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.productCode} — {p.name}</option>
                ))}
              </Select>
              {errors.productId && <p className="text-label text-error">{errors.productId.message}</p>}
              {products.data && products.data.content.length === 0 && (
                <p className="text-label text-muted-foreground">No active products. Create and approve a product first.</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="batchSize">Batch size *</Label>
                <Input id="batchSize" inputMode="decimal" aria-invalid={!!errors.batchSize} {...register("batchSize")} />
                {errors.batchSize && <p className="text-label text-error">{errors.batchSize.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit *</Label>
                <Input id="unit" aria-invalid={!!errors.unit} {...register("unit")} />
                {errors.unit && <p className="text-label text-error">{errors.unit.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manufacturingStartDate">Mfg start *</Label>
                <Input id="manufacturingStartDate" type="datetime-local" aria-invalid={!!errors.manufacturingStartDate} {...register("manufacturingStartDate")} />
                {errors.manufacturingStartDate && <p className="text-label text-error">{errors.manufacturingStartDate.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href="/batch-records">Cancel</Link></Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Batch"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
