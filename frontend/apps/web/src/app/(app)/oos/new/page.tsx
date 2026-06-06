"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateOos } from "@/hooks/useOos";
import { useProductList } from "@/hooks/useProduct";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";

const schema = z.object({
  productId: z.string().optional(),
  testMethod: z.string().optional(),
  specificationLimitMin: z.string().optional(),
  specificationLimitMax: z.string().optional(),
  reportedResult: z.string().trim().min(1, "Reported result is required"),
  reportedByName: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateOosPage() {
  const router = useRouter();
  const create = useCreateOos();
  const products = useProductList({ status: "ACTIVE", size: 100 });
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const o = await create.mutateAsync({
        productId: values.productId ? Number(values.productId) : null,
        testMethod: values.testMethod || null,
        specificationLimitMin: values.specificationLimitMin ? Number(values.specificationLimitMin) : null,
        specificationLimitMax: values.specificationLimitMax ? Number(values.specificationLimitMax) : null,
        reportedResult: values.reportedResult,
        reportedByName: values.reportedByName || null,
      });
      toast.success("OOS case created");
      router.push(`/oos/${o.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the OOS case. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New OOS Case</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/oos">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>OOS details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="productId">Product</Label>
                <Select id="productId" {...register("productId")}>
                  <option value="">—</option>
                  {products.data?.content.map((p) => <option key={p.id} value={String(p.id)}>{p.productCode} — {p.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="testMethod">Test method</Label><Input id="testMethod" {...register("testMethod")} /></div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="specificationLimitMin">Spec min</Label><Input id="specificationLimitMin" inputMode="decimal" {...register("specificationLimitMin")} /></div>
              <div className="space-y-1.5"><Label htmlFor="specificationLimitMax">Spec max</Label><Input id="specificationLimitMax" inputMode="decimal" {...register("specificationLimitMax")} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="reportedResult">Reported result *</Label>
                <Input id="reportedResult" aria-invalid={!!errors.reportedResult} {...register("reportedResult")} />
                {errors.reportedResult && <p className="text-label text-error">{errors.reportedResult.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5"><Label htmlFor="reportedByName">Reported by</Label><Input id="reportedByName" {...register("reportedByName")} /></div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href="/oos">Cancel</Link></Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create OOS Case"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
