"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateComplaint } from "@/hooks/useComplaint";
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
  source: z.enum(["CUSTOMER", "INTERNAL"]),
  severity: z.enum(["CRITICAL", "MAJOR", "MINOR"]),
  complaintDescription: z.string().trim().min(1, "Description is required"),
  reportedBy: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateComplaintPage() {
  const router = useRouter();
  const create = useCreateComplaint();
  const products = useProductList({ status: "ACTIVE", size: 100 });
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "CUSTOMER", severity: "MAJOR" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const c = await create.mutateAsync({
        productId: Number(values.productId),
        complaintDescription: values.complaintDescription,
        source: values.source,
        severity: values.severity,
        reportedBy: values.reportedBy || null,
      });
      toast.success("Complaint created");
      router.push(`/complaints/${c.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the complaint. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Complaint</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/complaints">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Complaint details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

            <div className="space-y-1.5">
              <Label htmlFor="productId">Product *</Label>
              <Select id="productId" aria-invalid={!!errors.productId} {...register("productId")}>
                <option value="">Select a product…</option>
                {products.data?.content.map((p) => <option key={p.id} value={String(p.id)}>{p.productCode} — {p.name}</option>)}
              </Select>
              {errors.productId && <p className="text-label text-error">{errors.productId.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="source">Source *</Label>
                <Select id="source" {...register("source")}><option value="CUSTOMER">Customer</option><option value="INTERNAL">Internal</option></Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity *</Label>
                <Select id="severity" {...register("severity")}><option value="MINOR">Minor</option><option value="MAJOR">Major</option><option value="CRITICAL">Critical</option></Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reportedBy">Reported by</Label>
                <Input id="reportedBy" placeholder="Name / contact" {...register("reportedBy")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complaintDescription">Description *</Label>
              <Textarea id="complaintDescription" rows={5} aria-invalid={!!errors.complaintDescription} {...register("complaintDescription")} />
              {errors.complaintDescription && <p className="text-label text-error">{errors.complaintDescription.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href="/complaints">Cancel</Link></Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Complaint"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
