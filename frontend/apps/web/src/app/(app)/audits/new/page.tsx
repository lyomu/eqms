"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateAudit } from "@/hooks/useAudit";
import { useUsers } from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";

const schema = z.object({
  auditTitle: z.string().trim().min(1, "Title is required"),
  auditType: z.enum(["INTERNAL", "SUPPLIER"]),
  scope: z.string().trim().min(1, "Scope is required"),
  auditDate: z.string().optional(),
  auditeeId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CreateAuditPage() {
  const router = useRouter();
  const create = useCreateAudit();
  const users = useUsers();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { auditType: "INTERNAL" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const a = await create.mutateAsync({
        auditTitle: values.auditTitle,
        auditType: values.auditType,
        scope: values.scope,
        auditDate: values.auditDate ? new Date(values.auditDate).toISOString() : null,
        auditeeId: values.auditeeId ? Number(values.auditeeId) : null,
      });
      toast.success("Audit created");
      router.push(`/audits/${a.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the audit. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Audit</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/audits">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Audit details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

            <div className="space-y-1.5">
              <Label htmlFor="auditTitle">Title *</Label>
              <Input id="auditTitle" aria-invalid={!!errors.auditTitle} {...register("auditTitle")} />
              {errors.auditTitle && <p className="text-label text-error">{errors.auditTitle.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="auditType">Type *</Label>
                <Select id="auditType" {...register("auditType")}><option value="INTERNAL">Internal</option><option value="SUPPLIER">Supplier</option></Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auditDate">Audit date</Label>
                <Input id="auditDate" type="date" {...register("auditDate")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auditeeId">Auditee</Label>
                <Select id="auditeeId" {...register("auditeeId")}>
                  <option value="">—</option>
                  {users.data?.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scope">Scope *</Label>
              <Textarea id="scope" rows={4} aria-invalid={!!errors.scope} {...register("scope")} />
              {errors.scope && <p className="text-label text-error">{errors.scope.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href="/audits">Cancel</Link></Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Audit"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
