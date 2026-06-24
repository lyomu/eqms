"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useCreateMaterial } from "@/hooks/useMaterial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { MATERIAL_TYPE_LABELS, UOM_LABELS } from "@/types/material";

const schema = z.object({
  name: z.string().trim().min(1, "Material name is required"),
  materialType: z.string().min(1, "Material type is required"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  specification: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  criticality: z.string().optional(),
  intendedUse: z.string().optional(),
  grade: z.string().optional(),
  casNumber: z.string().optional(),
  specificationReference: z.string().optional(),
  standardStorageCondition: z.string().optional(),
  minimumStockLevel: z.string().optional(),
  maximumStockLevel: z.string().optional(),
  reorderLevel: z.string().optional(),
  reorderQuantity: z.string().optional(),
  defaultWarehouse: z.string().optional(),
  defaultStorageLocation: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function BooleanToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-brand-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-body">{label}</span>
    </label>
  );
}

export default function CreateMaterialPage() {
  const router = useRouter();
  const create = useCreateMaterial();
  const [serverError, setServerError] = useState<string | null>(null);

  const [qcTestingRequired, setQcTestingRequired] = useState(false);
  const [samplingRequired, setSamplingRequired] = useState(false);
  const [coaRequired, setCoaRequired] = useState(true);
  const [sdsRequired, setSdsRequired] = useState(false);
  const [approvedSupplierRequired, setApprovedSupplierRequired] = useState(false);
  const [expiryDateRequired, setExpiryDateRequired] = useState(false);
  const [retestDateRequired, setRetestDateRequired] = useState(false);
  const [quarantineRequiredOnReceipt, setQuarantineRequiredOnReceipt] = useState(true);
  const [qaReleaseRequiredBeforeUse, setQaReleaseRequiredBeforeUse] = useState(true);
  const [riskAssessmentRequired, setRiskAssessmentRequired] = useState(false);
  const [fefoRequired, setFefoRequired] = useState(false);
  const [fifoRequired, setFifoRequired] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { materialType: "RAW_MATERIAL", unitOfMeasure: "KG" },
  });

  const busy = create.isPending;

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const m = await create.mutateAsync({
        name: values.name,
        materialType: values.materialType as never,
        unitOfMeasure: values.unitOfMeasure as never,
        specification: values.specification || undefined,
        description: values.description || undefined,
        category: values.category || undefined,
        criticality: values.criticality || undefined,
        intendedUse: values.intendedUse || undefined,
        grade: values.grade || undefined,
        casNumber: values.casNumber || undefined,
        specificationReference: values.specificationReference || undefined,
        standardStorageCondition: values.standardStorageCondition || undefined,
        qcTestingRequired,
        samplingRequired,
        coaRequired,
        sdsRequired,
        approvedSupplierRequired,
        expiryDateRequired,
        retestDateRequired,
        quarantineRequiredOnReceipt,
        qaReleaseRequiredBeforeUse,
        riskAssessmentRequired,
        fefoRequired,
        fifoRequired,
        minimumStockLevel: values.minimumStockLevel ? parseFloat(values.minimumStockLevel) : undefined,
        maximumStockLevel: values.maximumStockLevel ? parseFloat(values.maximumStockLevel) : undefined,
        reorderLevel: values.reorderLevel ? parseFloat(values.reorderLevel) : undefined,
        reorderQuantity: values.reorderQuantity ? parseFloat(values.reorderQuantity) : undefined,
        defaultWarehouse: values.defaultWarehouse || undefined,
        defaultStorageLocation: values.defaultStorageLocation || undefined,
      });
      toast.success("Material created");
      router.push(`/materials/${m.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the material. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-label text-muted-foreground">
            <Link href="/materials" className="hover:underline">Materials</Link> / New
          </p>
          <h1 className="text-h1 text-brand-primary">New Material</h1>
        </div>
      </div>

      {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

      {/* Section A — Basic Details */}
      <Card>
        <CardHeader><CardTitle>A. Basic Material Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Material Name *</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-label text-error">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="materialType">Material Type *</Label>
              <Select id="materialType" {...register("materialType")}>
                {(Object.keys(MATERIAL_TYPE_LABELS) as Array<keyof typeof MATERIAL_TYPE_LABELS>).map((t) => (
                  <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select id="category" {...register("category")}>
                <option value="">— Select —</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="criticality">Criticality</Label>
              <Select id="criticality" {...register("criticality")}>
                <option value="">— Select —</option>
                <option value="CRITICAL">Critical</option>
                <option value="NON_CRITICAL">Non-Critical</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="intendedUse">Intended Use</Label>
            <Textarea id="intendedUse" rows={2} {...register("intendedUse")} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
              <Select id="unitOfMeasure" {...register("unitOfMeasure")}>
                {(Object.keys(UOM_LABELS) as Array<keyof typeof UOM_LABELS>).map((u) => (
                  <option key={u} value={u}>{UOM_LABELS[u]}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grade">Grade</Label>
              <Select id="grade" {...register("grade")}>
                <option value="">— Select —</option>
                <option value="PHARMA_GRADE">Pharma Grade</option>
                <option value="FOOD_GRADE">Food Grade</option>
                <option value="ANALYTICAL_GRADE">Analytical Grade</option>
                <option value="TECHNICAL_GRADE">Technical Grade</option>
                <option value="MEDICAL_GRADE">Medical Grade</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="casNumber">CAS Number</Label>
              <Input id="casNumber" placeholder="e.g. 50-78-2" {...register("casNumber")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specificationReference">Specification Reference</Label>
            <Input id="specificationReference" placeholder="e.g. BP 2024 / EP 11 / USP" {...register("specificationReference")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specification">Specification Document</Label>
            <Textarea id="specification" rows={3} placeholder="Enter the specification text or reference document details…" {...register("specification")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="standardStorageCondition">Standard Storage Condition</Label>
            <Select id="standardStorageCondition" {...register("standardStorageCondition")}>
              <option value="">— Select —</option>
              <option value="AMBIENT">Ambient</option>
              <option value="REFRIGERATED">Refrigerated (2–8°C)</option>
              <option value="FROZEN">Frozen (≤ −20°C)</option>
              <option value="CONTROLLED_ROOM_TEMPERATURE">Controlled Room Temperature (15–25°C)</option>
              <option value="HUMIDITY_CONTROLLED">Humidity Controlled</option>
              <option value="LIGHT_PROTECTED">Light Protected</option>
              <option value="HAZARDOUS">Hazardous / Controlled</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section B — QA Control Requirements */}
      <Card>
        <CardHeader><CardTitle>B. QA Control Requirements</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BooleanToggle label="QC Testing Required" checked={qcTestingRequired} onChange={setQcTestingRequired} />
            <BooleanToggle label="Sampling Required" checked={samplingRequired} onChange={setSamplingRequired} />
            <BooleanToggle label="Certificate of Analysis (COA) Required" checked={coaRequired} onChange={setCoaRequired} />
            <BooleanToggle label="Safety Data Sheet (SDS/MSDS) Required" checked={sdsRequired} onChange={setSdsRequired} />
            <BooleanToggle label="Approved Supplier Required" checked={approvedSupplierRequired} onChange={setApprovedSupplierRequired} />
            <BooleanToggle label="Expiry Date Required" checked={expiryDateRequired} onChange={setExpiryDateRequired} />
            <BooleanToggle label="Retest Date Required" checked={retestDateRequired} onChange={setRetestDateRequired} />
            <BooleanToggle label="Quarantine on Receipt" checked={quarantineRequiredOnReceipt} onChange={setQuarantineRequiredOnReceipt} />
            <BooleanToggle label="QA Release Required Before Use" checked={qaReleaseRequiredBeforeUse} onChange={setQaReleaseRequiredBeforeUse} />
            <BooleanToggle label="Risk Assessment Required" checked={riskAssessmentRequired} onChange={setRiskAssessmentRequired} />
          </div>
        </CardContent>
      </Card>

      {/* Section C — Stock Control */}
      <Card>
        <CardHeader><CardTitle>C. Stock Control</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="minimumStockLevel">Min Stock Level</Label>
              <Input id="minimumStockLevel" type="number" step="any" min="0" {...register("minimumStockLevel")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maximumStockLevel">Max Stock Level</Label>
              <Input id="maximumStockLevel" type="number" step="any" min="0" {...register("maximumStockLevel")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input id="reorderLevel" type="number" step="any" min="0" {...register("reorderLevel")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input id="reorderQuantity" type="number" step="any" min="0" {...register("reorderQuantity")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="defaultWarehouse">Default Warehouse</Label>
              <Input id="defaultWarehouse" {...register("defaultWarehouse")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultStorageLocation">Default Storage Location</Label>
              <Input id="defaultStorageLocation" {...register("defaultStorageLocation")} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <BooleanToggle label="FEFO Required (First Expired, First Out)" checked={fefoRequired} onChange={setFefoRequired} />
            <BooleanToggle label="FIFO Required (First In, First Out)" checked={fifoRequired} onChange={setFifoRequired} />
          </div>
        </CardContent>
      </Card>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-6 py-3 shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
          <Button asChild variant="ghost" disabled={busy}><Link href="/materials">Cancel</Link></Button>
          <Button variant="outline" disabled={busy} onClick={handleSubmit(onSubmit)}>Save as Draft</Button>
          <Button disabled={busy} onClick={handleSubmit(onSubmit)}>
            {busy ? "Creating…" : "Create Material"}
          </Button>
        </div>
      </div>
    </div>
  );
}
