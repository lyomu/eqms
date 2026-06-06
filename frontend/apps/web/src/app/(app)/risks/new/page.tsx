"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateRisk } from "@/hooks/useRisk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { CATEGORY_LABELS, type RiskCategory } from "@/types/risk";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as RiskCategory[];

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  category: z.enum(["PRODUCT", "PROCESS", "EQUIPMENT", "ORGANIZATION"]),
  description: z.string().trim().min(1, "Description is required"),
  potentialImpact: z.string().trim().min(1, "Potential impact is required"),
});
type FormValues = z.infer<typeof schema>;

export default function CreateRiskPage() {
  const router = useRouter();
  const create = useCreateRisk();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "PROCESS" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const r = await create.mutateAsync(values);
      toast.success("Risk created");
      router.push(`/risks/${r.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the risk. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Risk</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/risks">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Risk details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
                {errors.title && <p className="text-label text-error">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Select id="category" {...register("category")}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={4} aria-invalid={!!errors.description} {...register("description")} />
              {errors.description && <p className="text-label text-error">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="potentialImpact">Potential impact *</Label>
              <Textarea id="potentialImpact" rows={3} aria-invalid={!!errors.potentialImpact} {...register("potentialImpact")} />
              {errors.potentialImpact && <p className="text-label text-error">{errors.potentialImpact.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href="/risks">Cancel</Link></Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Risk"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
