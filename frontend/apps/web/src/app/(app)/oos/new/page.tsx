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
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import {
  OOS_RECORD_TYPE_LABELS,
  OOS_SEVERITY_LABELS,
  OOS_TEST_CATEGORY_LABELS,
  OOS_SAMPLE_TYPE_LABELS,
  type OosRecordType,
  type OosSeverity,
  type OosTestCategory,
  type OosSampleType,
} from "@/types/oos";

const schema = z.object({
  // Basic details
  title: z.string().optional(),
  description: z.string().optional(),
  recordType: z.string().optional(),
  severity: z.string().optional(),
  department: z.string().optional(),
  lab: z.string().optional(),
  productId: z.string().optional(),
  batchId: z.string().optional(),

  // Test result details
  testCategory: z.string().optional(),
  testName: z.string().optional(),
  testMethod: z.string().optional(),
  specificationLimitMin: z.string().optional(),
  specificationLimitMax: z.string().optional(),
  specificationReference: z.string().optional(),
  reportedResult: z.string().trim().min(1, "Reported result is required"),
  unitOfMeasure: z.string().optional(),
  sampleId: z.string().optional(),
  sampleType: z.string().optional(),
  analystId: z.string().optional(),
  reportedByName: z.string().optional(),
  equipmentId: z.string().optional(),
  calibrationStatusAtTest: z.string().optional(),
  reagentUsed: z.string().optional(),
  reagentLot: z.string().optional(),
  referenceStdLot: z.string().optional(),

  // Immediate containment
  immediateHoldRequired: z.boolean().optional(),
  holdAppliedTo: z.string().optional(),
  holdReason: z.string().optional(),
  immediateActionTaken: z.string().optional(),
  productionImpact: z.boolean().optional(),
  releasedProductImpact: z.boolean().optional(),
  customerImpact: z.boolean().optional(),
  regulatoryImpact: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CreateOosPage() {
  const router = useRouter();
  const create = useCreateOos();
  const products = useProductList({ status: "ACTIVE", size: 100 });
  const [serverError, setServerError] = useState<string | null>(null);
  const [holdRequired, setHoldRequired] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const o = await create.mutateAsync({
        title: values.title || null,
        description: values.description || null,
        recordType: values.recordType || null,
        severity: values.severity || null,
        department: values.department || null,
        lab: values.lab || null,
        productId: values.productId ? Number(values.productId) : null,
        batchId: values.batchId || null,
        testCategory: values.testCategory || null,
        testName: values.testName || null,
        testMethod: values.testMethod || null,
        specificationLimitMin: values.specificationLimitMin ? Number(values.specificationLimitMin) : null,
        specificationLimitMax: values.specificationLimitMax ? Number(values.specificationLimitMax) : null,
        specificationReference: values.specificationReference || null,
        reportedResult: values.reportedResult,
        unitOfMeasure: values.unitOfMeasure || null,
        sampleId: values.sampleId || null,
        sampleType: values.sampleType || null,
        reportedByName: values.reportedByName || null,
        equipmentId: values.equipmentId || null,
        immediateHoldRequired: holdRequired,
        holdAppliedTo: holdRequired ? (values.holdAppliedTo || null) : null,
        holdReason: holdRequired ? (values.holdReason || null) : null,
        immediateActionTaken: values.immediateActionTaken || null,
        productionImpact: values.productionImpact ?? false,
        releasedProductImpact: values.releasedProductImpact ?? false,
        customerImpact: values.customerImpact ?? false,
        regulatoryImpact: values.regulatoryImpact ?? false,
      });
      toast.success("OOS case reported");
      router.push(`/oos/${o.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not create the OOS case. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <div className="text-label text-muted-foreground">
            <Link href="/oos" className="hover:underline">OOS Register</Link>
            {" / "}New Report
          </div>
          <h1 className="text-h1 text-brand-primary">Report OOS / OOT</h1>
        </div>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/oos">Cancel</Link>
        </Button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <ErrorAlert title="Couldn't create" message={serverError} />}

        {/* Section 1 — Basic Details */}
        <Card>
          <CardHeader><CardTitle>Basic Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title / Description</Label>
              <Input id="title" placeholder="Brief description of the discrepancy" {...register("title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea id="description" rows={2} placeholder="Additional context about the OOS/OOT event" {...register("description")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="recordType">Record Type</Label>
                <Select id="recordType" {...register("recordType")}>
                  <option value="">Select type…</option>
                  {(Object.keys(OOS_RECORD_TYPE_LABELS) as OosRecordType[]).map((k) => (
                    <option key={k} value={k}>{OOS_RECORD_TYPE_LABELS[k]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity</Label>
                <Select id="severity" {...register("severity")}>
                  <option value="">Select…</option>
                  {(Object.keys(OOS_SEVERITY_LABELS) as OosSeverity[]).map((k) => (
                    <option key={k} value={k}>{OOS_SEVERITY_LABELS[k]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="productId">Product</Label>
                <Select id="productId" {...register("productId")}>
                  <option value="">—</option>
                  {products.data?.content.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.productCode} — {p.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input id="department" placeholder="e.g. QC Laboratory" {...register("department")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab">Laboratory</Label>
                <Input id="lab" placeholder="Lab name or room" {...register("lab")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batchId">Batch / Lot No.</Label>
                <Input id="batchId" {...register("batchId")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 — Test Result Details */}
        <Card>
          <CardHeader><CardTitle>Test Result Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="testCategory">Test Category</Label>
                <Select id="testCategory" {...register("testCategory")}>
                  <option value="">Select…</option>
                  {(Object.keys(OOS_TEST_CATEGORY_LABELS) as OosTestCategory[]).map((k) => (
                    <option key={k} value={k}>{OOS_TEST_CATEGORY_LABELS[k]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="testName">Test Name</Label>
                <Input id="testName" placeholder="e.g. Assay, Endotoxin" {...register("testName")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="testMethod">Test Method Ref.</Label>
                <Input id="testMethod" placeholder="SOP-QC-001" {...register("testMethod")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="specificationLimitMin">Spec Min</Label>
                <Input id="specificationLimitMin" inputMode="decimal" placeholder="e.g. 95.0" {...register("specificationLimitMin")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specificationLimitMax">Spec Max</Label>
                <Input id="specificationLimitMax" inputMode="decimal" placeholder="e.g. 105.0" {...register("specificationLimitMax")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reportedResult">Reported Result *</Label>
                <Input
                  id="reportedResult"
                  placeholder="e.g. 88.3"
                  aria-invalid={!!errors.reportedResult}
                  {...register("reportedResult")}
                />
                {errors.reportedResult && (
                  <p className="text-label text-error">{errors.reportedResult.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitOfMeasure">Unit</Label>
                <Input id="unitOfMeasure" placeholder="e.g. %, mg/mL" {...register("unitOfMeasure")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specificationReference">Specification Reference</Label>
              <Input id="specificationReference" placeholder="e.g. BP 2024 Monograph, Internal Spec SPEC-001" {...register("specificationReference")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sampleType">Sample Type</Label>
                <Select id="sampleType" {...register("sampleType")}>
                  <option value="">Select…</option>
                  {(Object.keys(OOS_SAMPLE_TYPE_LABELS) as OosSampleType[]).map((k) => (
                    <option key={k} value={k}>{OOS_SAMPLE_TYPE_LABELS[k]}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sampleId">Sample ID / Reference</Label>
                <Input id="sampleId" {...register("sampleId")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="equipmentId">Equipment ID</Label>
                <Input id="equipmentId" placeholder="Instrument serial / asset tag" {...register("equipmentId")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reagentUsed">Reagent / Standard Used</Label>
                <Input id="reagentUsed" {...register("reagentUsed")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reagentLot">Reagent Lot No.</Label>
                <Input id="reagentLot" {...register("reagentLot")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reportedByName">Reported By (Analyst Name)</Label>
              <Input id="reportedByName" placeholder="Name of analyst who detected the OOS" {...register("reportedByName")} />
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — Immediate Containment */}
        <Card>
          <CardHeader><CardTitle>Immediate Containment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="immediateHoldRequired"
                className="h-4 w-4"
                checked={holdRequired}
                onChange={(e) => setHoldRequired(e.target.checked)}
              />
              <Label htmlFor="immediateHoldRequired" className="cursor-pointer">
                Immediate hold / quarantine required
              </Label>
            </div>

            {holdRequired && (
              <div className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="holdAppliedTo">Hold Applied To</Label>
                    <Select id="holdAppliedTo" {...register("holdAppliedTo")}>
                      <option value="">Select…</option>
                      <option value="BATCH">Batch</option>
                      <option value="LOT">Lot</option>
                      <option value="PRODUCT">Product</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="MATERIAL">Material</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="holdReason">Hold Reason</Label>
                    <Input id="holdReason" placeholder="Reason for placing on hold" {...register("holdReason")} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="immediateActionTaken">Immediate Action Taken</Label>
              <Textarea
                id="immediateActionTaken"
                rows={2}
                placeholder="Describe any immediate actions already taken (e.g. stopped production, notified supervisor)"
                {...register("immediateActionTaken")}
              />
            </div>

            <div>
              <p className="text-label font-semibold text-muted-foreground mb-2">Impact Assessment (initial estimate)</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 sm:grid-cols-4">
                {[
                  { field: "productionImpact" as const, label: "Production impact" },
                  { field: "releasedProductImpact" as const, label: "Released product impacted" },
                  { field: "customerImpact" as const, label: "Customer impact" },
                  { field: "regulatoryImpact" as const, label: "Regulatory impact" },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer text-body">
                    <input type="checkbox" className="h-4 w-4" {...register(field)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline"><Link href="/oos">Cancel</Link></Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Reporting…" : "Report OOS / OOT"}
          </Button>
        </div>
      </form>
    </div>
  );
}
