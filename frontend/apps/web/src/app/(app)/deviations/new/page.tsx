"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateDeviation, useDeviationTransition } from "@/hooks/useDeviation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
  description: z.string().trim().min(1, "Description is required"),
  immediateAction: z.string().optional(),
  occurredDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateDeviationPage() {
  const router = useRouter();
  const create = useCreateDeviation();
  const transition = useDeviationTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "MINOR" },
  });

  const busy = create.isPending || transition.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "investigate") {
    setServerError(null);
    try {
      const d = await create.mutateAsync({
        title: values.title,
        severity: values.severity,
        description: values.description,
        immediateAction: values.immediateAction || null,
        occurredDate: values.occurredDate ? `${values.occurredDate}T00:00:00Z` : null,
      });
      if (intent === "investigate") {
        await transition.mutateAsync({ id: d.id, action: "submit-for-investigation", expectedVersion: d.version, reason: "Submitted for investigation" });
      }
      toast.success("Deviation created");
      router.push(`/deviations/${d.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the deviation. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Deviation</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/deviations">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Deviation details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" noValidate>
            {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
              {errors.title && <p className="text-label text-error">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity *</Label>
                <Select id="severity" {...register("severity")}>
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="occurredDate">Occurred date</Label>
                <Input id="occurredDate" type="date" {...register("occurredDate")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={5} aria-invalid={!!errors.description} {...register("description")} />
              {errors.description && <p className="text-label text-error">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="immediateAction">Immediate action</Label>
              <Textarea id="immediateAction" rows={3} {...register("immediateAction")} />
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "draft"))}>Save as Draft</Button>
              <Button type="button" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "investigate"))}>
                {busy ? "Saving…" : "Submit for Investigation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
