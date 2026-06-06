"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateEquipment } from "@/hooks/useEquipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EQUIPMENT_TYPES, equipmentTypeLabel, type EquipmentType } from "@/types/equipment";

const schema = z.object({
  equipmentName: z.string().trim().min(1, "Name is required"),
  equipmentType: z.enum(EQUIPMENT_TYPES as [EquipmentType, ...EquipmentType[]]),
  manufacturer: z.string().trim().min(1, "Manufacturer is required"),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  acquisitionDate: z.string().optional(),
  calibrationFrequencyMonths: z.string().optional().refine((v) => !v || Number(v) > 0, "Must be a positive number"),
});
type FormValues = z.infer<typeof schema>;

export default function CreateEquipmentPage() {
  const router = useRouter();
  const create = useCreateEquipment();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { equipmentType: "BALANCE" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const e = await create.mutateAsync({
        equipmentName: values.equipmentName,
        equipmentType: values.equipmentType,
        manufacturer: values.manufacturer,
        model: values.model || null,
        serialNumber: values.serialNumber || null,
        location: values.location || null,
        acquisitionDate: values.acquisitionDate || null,
        calibrationFrequencyMonths: values.calibrationFrequencyMonths ? Number(values.calibrationFrequencyMonths) : null,
      });
      toast.success("Equipment created");
      router.push(`/equipment/${e.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the equipment. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-h1 text-brand-primary">New Equipment</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto"><Link href="/equipment">Cancel</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Equipment details</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="equipmentName">Name *</Label>
                <Input id="equipmentName" aria-invalid={!!errors.equipmentName} {...register("equipmentName")} />
                {errors.equipmentName && <p className="text-label text-error">{errors.equipmentName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="equipmentType">Type *</Label>
                <Select id="equipmentType" {...register("equipmentType")}>
                  {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{equipmentTypeLabel(t)}</option>)}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input id="manufacturer" aria-invalid={!!errors.manufacturer} {...register("manufacturer")} />
                {errors.manufacturer && <p className="text-label text-error">{errors.manufacturer.message}</p>}
              </div>
              <div className="space-y-1.5"><Label htmlFor="model">Model</Label><Input id="model" {...register("model")} /></div>
              <div className="space-y-1.5"><Label htmlFor="serialNumber">Serial number</Label><Input id="serialNumber" {...register("serialNumber")} /></div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5"><Label htmlFor="location">Location</Label><Input id="location" {...register("location")} /></div>
              <div className="space-y-1.5"><Label htmlFor="acquisitionDate">Acquisition date</Label><Input id="acquisitionDate" type="date" {...register("acquisitionDate")} /></div>
              <div className="space-y-1.5">
                <Label htmlFor="calibrationFrequencyMonths">Cal. frequency (months)</Label>
                <Input id="calibrationFrequencyMonths" inputMode="numeric" placeholder="e.g. 12" aria-invalid={!!errors.calibrationFrequencyMonths} {...register("calibrationFrequencyMonths")} />
                {errors.calibrationFrequencyMonths && <p className="text-label text-error">{errors.calibrationFrequencyMonths.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button asChild variant="outline"><Link href="/equipment">Cancel</Link></Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Equipment"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
