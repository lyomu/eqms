"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateChange, useChangeAction } from "@/hooks/useChangeControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(["MAJOR", "MINOR"]),
  description: z.string().trim().min(1, "Description is required"),
  justification: z.string().optional(),
  effectivenessCheckRequired: z.boolean().optional(),
  targetImplementationDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateChangePage() {
  const router = useRouter();
  const create = useCreateChange();
  const submitForReview = useChangeAction();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: "MINOR" } });

  const busy = create.isPending || submitForReview.isPending;

  async function onSubmit(values: FormValues, intent: "draft" | "review") {
    setServerError(null);
    try {
      const cc = await create.mutateAsync({
        title: values.title,
        type: values.type,
        description: values.description,
        justification: values.justification || null,
        effectivenessCheckRequired: !!values.effectivenessCheckRequired,
        targetImplementationDate: values.targetImplementationDate
          ? `${values.targetImplementationDate}T00:00:00Z`
          : null,
      });
      if (intent === "review") {
        await submitForReview.mutateAsync({
          id: cc.id,
          action: "submit-for-review",
          expectedVersion: cc.version,
          reason: "Submitted for review",
        });
      }
      toast.success("Change request created");
      router.push(`/change-control/${cc.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the change request. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Change Request</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/change-control">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change details</CardTitle>
        </CardHeader>
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
                <Label htmlFor="type">Change type *</Label>
                <Select id="type" {...register("type")}>
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="targetImplementationDate">Target implementation date</Label>
                <Input id="targetImplementationDate" type="date" {...register("targetImplementationDate")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" rows={5} aria-invalid={!!errors.description} {...register("description")} />
              {errors.description && <p className="text-label text-error">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="justification">Justification</Label>
              <Textarea id="justification" rows={3} {...register("justification")} />
            </div>

            <label className="flex items-center gap-2 text-body">
              <input type="checkbox" className="h-4 w-4" {...register("effectivenessCheckRequired")} />
              Effectiveness check required
            </label>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "draft"))}>
                Save as Draft
              </Button>
              <Button type="button" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "review"))}>
                {busy ? "Saving…" : "Submit for Review"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
