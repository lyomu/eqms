"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateCapa, useCapaTransition } from "@/hooks/useCapa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { CAPA_SOURCE_LABELS, type CapaSource } from "@/types/capa";

const SOURCES = Object.keys(CAPA_SOURCE_LABELS) as CapaSource[];

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  source: z.enum(["DEVIATION", "AUDIT_FINDING", "COMPLAINT", "OOS", "SUPPLIER", "INTERNAL", "OTHER"]),
  description: z.string().trim().min(1, "Problem description is required"),
  effectivenessCheckRequired: z.boolean().optional(),
  dueDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateCapaPage() {
  const router = useRouter();
  const create = useCreateCapa();
  const transition = useCapaTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "DEVIATION" },
  });

  const busy = create.isPending || transition.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "investigate") {
    setServerError(null);
    try {
      const capa = await create.mutateAsync({
        title: values.title,
        source: values.source,
        description: values.description,
        effectivenessCheckRequired: !!values.effectivenessCheckRequired,
        dueDate: values.dueDate ? `${values.dueDate}T00:00:00Z` : null,
      });
      if (intent === "investigate") {
        await transition.mutateAsync({ id: capa.id, action: "submit-for-investigation", expectedVersion: capa.version, reason: "Submitted for investigation" });
      }
      toast.success("CAPA created");
      router.push(`/capa/${capa.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the CAPA. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New CAPA</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/capa">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>CAPA details</CardTitle></CardHeader>
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
                <Label htmlFor="source">Source *</Label>
                <Select id="source" {...register("source")}>
                  {SOURCES.map((s) => <option key={s} value={s}>{CAPA_SOURCE_LABELS[s]}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" {...register("dueDate")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Problem description *</Label>
              <Textarea id="description" rows={5} aria-invalid={!!errors.description} {...register("description")} />
              {errors.description && <p className="text-label text-error">{errors.description.message}</p>}
            </div>

            <label className="flex items-center gap-2 text-body">
              <input type="checkbox" className="h-4 w-4" {...register("effectivenessCheckRequired")} />
              Effectiveness check required
            </label>

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
