"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { ClipboardCheck, FileCheck2, FileText, ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateChange, useChangeAction } from "@/hooks/useChangeControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Badge } from "@/components/ui/badge";
import type { ChangeImpactTask } from "@/types/change-control";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(["MAJOR", "MINOR"]),
  locationName: z.string().optional(),
  purposeOfChange: z.string().optional(),
  regulatoryMandateEffectiveDate: z.string().optional(),
  regulatoryMandateSource: z.string().optional(),
  changeCategory: z.string().optional(),
  relatedMarket: z.string().optional(),
  relatedCustomer: z.string().optional(),
  vendorCode: z.string().optional(),
  vendorName: z.string().optional(),
  productItemCode: z.string().optional(),
  productItemDescription: z.string().optional(),
  equipmentIdNumber: z.string().optional(),
  equipmentName: z.string().optional(),
  documentName: z.string().optional(),
  documentNumber: z.string().optional(),
  description: z.string().trim().min(1, "Brief of current status is required"),
  currentStatusBrief: z.string().optional(),
  proposedChangeBrief: z.string().trim().min(1, "Brief of proposed change is required"),
  justification: z.string().trim().min(1, "Justification is required"),
  changeNature: z.string().optional(),
  temporaryChangePeriod: z.string().optional(),
  targetImplementationDate: z.string().optional(),
  effectivenessCheckRequired: z.boolean().optional(),
  changeOwner: z.string().optional(),
  changeOwnerHod: z.string().optional(),
  qaResponsible: z.string().optional(),
  involvedDepartmentsText: z.string().optional(),
  radAssessmentRequired: z.string().optional(),
  customerCgAssessmentRequired: z.string().optional(),
  customerCgComments: z.string().optional(),
  qaAssessmentBy: z.string().optional(),
  qaAssessmentOn: z.string().optional(),
  internalCustomer: z.string().optional(),
  changeAcceptance: z.string().optional(),
  qaComment: z.string().optional(),
  recommendations: z.string().optional(),
  qpComments: z.string().optional(),
  variationClassification: z.string().optional(),
  documentsRequestedForFiling: z.string().optional(),
  recommendationForRelease: z.string().optional(),
  otherRecommendations: z.string().optional(),
  radAssessment: z.string().optional(),
  otherDepartmentsReview: z.string().optional(),
  finalQaDecision: z.string().optional(),
  qaReviewDate: z.string().optional(),
  qaReviewer: z.string().optional(),
  implementationDetails: z.string().optional(),
  implementationReview: z.string().optional(),
  actionConfirmationComment: z.string().optional(),
  changeEffectiveDate: z.string().optional(),
  closureRemarks: z.string().optional(),
  batchArNumber: z.string().optional(),
  productMaterialCode: z.string().optional(),
  productMaterialName: z.string().optional(),
  closedByName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type SaveIntent = "draft" | "review";
type Stage = "initiation" | "impact" | "qa" | "closure";

const DEFAULT_TASKS: ChangeImpactTask[] = [
  { checkpointNo: 1, impactArea: "Revision of SOP/WI/Protocol/Learning Content", applicability: "Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 2, impactArea: "Creation of Training Assessment - Master Question & Answer and Training Assessment", applicability: "Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 3, impactArea: "Training form assigning to applicable department", applicability: "Not Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 4, impactArea: "Filled Training Item Mapping form receipt", applicability: "Not Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 5, impactArea: "Learning Content Mapping into curricula", applicability: "Not Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 6, impactArea: "Upload the SOP/WI/Protocol", applicability: "Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 7, impactArea: "Training to the concern personnel on revised document", applicability: "Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
  { checkpointNo: 8, impactArea: "Others (Specify)", applicability: "Not Applicable", proposedTask: "", taskAssignee: "", remarks: "" },
];

export default function CreateChangePage() {
  const router = useRouter();
  const create = useCreateChange();
  const submitForReview = useChangeAction();
  const [stage, setStage] = useState<Stage>("initiation");
  const [impactTasks, setImpactTasks] = useState<ChangeImpactTask[]>(DEFAULT_TASKS);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveIntent, setSaveIntent] = useState<SaveIntent | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "MINOR",
      changeNature: "Permanent",
      regulatoryMandateSource: "Not Applicable",
      relatedMarket: "Not Applicable",
      relatedCustomer: "Not Applicable",
      customerCgAssessmentRequired: "Not Applicable",
      radAssessmentRequired: "No",
      effectivenessCheckRequired: false,
    },
  });

  const busy = create.isPending || submitForReview.isPending || saveIntent !== null;
  const stageStatus = {
    initiation: Boolean(watch("title") && watch("proposedChangeBrief") && watch("justification")),
    impact: impactTasks.some((task) => task.proposedTask || task.taskAssignee),
    qa: Boolean(watch("qaResponsible") || watch("qaAssessmentBy") || watch("finalQaDecision")),
    closure: Boolean(watch("implementationDetails") || watch("closureRemarks")),
  };

  async function onSubmit(values: FormValues, intent: SaveIntent) {
    setServerError(null);
    setSaveIntent(intent);
    try {
      const cc = await create.mutateAsync({
        title: values.title,
        type: values.type,
        description: values.currentStatusBrief || values.description,
        locationName: emptyToNull(values.locationName),
        purposeOfChange: emptyToNull(values.purposeOfChange),
        regulatoryMandateEffectiveDate: dateToIso(values.regulatoryMandateEffectiveDate),
        regulatoryMandateSource: emptyToNull(values.regulatoryMandateSource),
        changeCategory: emptyToNull(values.changeCategory),
        relatedMarket: emptyToNull(values.relatedMarket),
        relatedCustomer: emptyToNull(values.relatedCustomer),
        vendorCode: emptyToNull(values.vendorCode),
        vendorName: emptyToNull(values.vendorName),
        productItemCode: emptyToNull(values.productItemCode),
        productItemDescription: emptyToNull(values.productItemDescription),
        equipmentIdNumber: emptyToNull(values.equipmentIdNumber),
        equipmentName: emptyToNull(values.equipmentName),
        documentName: emptyToNull(values.documentName),
        documentNumber: emptyToNull(values.documentNumber),
        currentStatusBrief: emptyToNull(values.currentStatusBrief || values.description),
        proposedChangeBrief: values.proposedChangeBrief,
        justification: values.justification,
        changeNature: emptyToNull(values.changeNature),
        temporaryChangePeriod: emptyToNull(values.temporaryChangePeriod),
        effectivenessCheckRequired: !!values.effectivenessCheckRequired,
        targetImplementationDate: dateToIso(values.targetImplementationDate),
        changeOwner: emptyToNull(values.changeOwner),
        changeOwnerHod: emptyToNull(values.changeOwnerHod),
        qaResponsible: emptyToNull(values.qaResponsible),
        involvedDepartments: splitList(values.involvedDepartmentsText),
        impactTasks: impactTasks.map((task, index) => ({ ...task, checkpointNo: task.checkpointNo ?? index + 1 })),
        radAssessmentRequired: emptyToNull(values.radAssessmentRequired),
        customerCgAssessmentRequired: emptyToNull(values.customerCgAssessmentRequired),
        customerCgComments: emptyToNull(values.customerCgComments),
        qaAssessmentBy: emptyToNull(values.qaAssessmentBy),
        qaAssessmentOn: dateToIso(values.qaAssessmentOn),
        internalCustomer: emptyToNull(values.internalCustomer),
        changeAcceptance: emptyToNull(values.changeAcceptance),
        qaComment: emptyToNull(values.qaComment),
        recommendations: emptyToNull(values.recommendations),
        qpComments: emptyToNull(values.qpComments),
        variationClassification: emptyToNull(values.variationClassification),
        documentsRequestedForFiling: emptyToNull(values.documentsRequestedForFiling),
        recommendationForRelease: emptyToNull(values.recommendationForRelease),
        otherRecommendations: emptyToNull(values.otherRecommendations),
        radAssessment: emptyToNull(values.radAssessment),
        otherDepartmentsReview: emptyToNull(values.otherDepartmentsReview),
        finalQaDecision: emptyToNull(values.finalQaDecision),
        qaReviewDate: dateToIso(values.qaReviewDate),
        qaReviewer: emptyToNull(values.qaReviewer),
        implementationDetails: emptyToNull(values.implementationDetails),
        implementationReview: emptyToNull(values.implementationReview),
        actionConfirmationComment: emptyToNull(values.actionConfirmationComment),
        changeEffectiveDate: dateToIso(values.changeEffectiveDate),
        closureRemarks: emptyToNull(values.closureRemarks),
        batchArNumber: emptyToNull(values.batchArNumber),
        productMaterialCode: emptyToNull(values.productMaterialCode),
        productMaterialName: emptyToNull(values.productMaterialName),
        closedByName: emptyToNull(values.closedByName),
      });
      if (intent === "review") {
        await submitForReview.mutateAsync({
          id: cc.id,
          action: "submit-for-review",
          expectedVersion: cc.version,
          reason: "Submitted for QA assessment",
        });
      }
      toast.success(intent === "review" ? "Change request submitted" : "Change request saved");
      router.push(`/change-control/${cc.id}`);
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setServerError(ax.response?.data?.message ?? "Could not save the change request. Please try again.");
      setSaveIntent(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">New Change Control</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StageButton active={stage === "initiation"} complete={stageStatus.initiation} onClick={() => setStage("initiation")} icon={<FileText className="h-4 w-4" />}>CC Initiation</StageButton>
            <StageButton active={stage === "impact"} complete={stageStatus.impact} onClick={() => setStage("impact")} icon={<ListChecks className="h-4 w-4" />}>Impact Tasks</StageButton>
            <StageButton active={stage === "qa"} complete={stageStatus.qa} onClick={() => setStage("qa")} icon={<ClipboardCheck className="h-4 w-4" />}>QA Assessment</StageButton>
            <StageButton active={stage === "closure"} complete={stageStatus.closure} onClick={() => setStage("closure")} icon={<FileCheck2 className="h-4 w-4" />}>Closure</StageButton>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href="/change-control">Cancel</Link>
        </Button>
      </div>

      {serverError && <ErrorAlert title="Couldn't save" message={serverError} />}

      <form className="space-y-4" noValidate>
        {stage === "initiation" && (
          <>
            <Section title="Change Control Initiation">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="Title *" id="title" error={errors.title?.message} className="lg:col-span-2">
                  <Input id="title" {...register("title")} aria-invalid={!!errors.title} />
                </Field>
                <Field label="Change Classification *" id="type">
                  <Select id="type" {...register("type")}>
                    <option value="MINOR">Minor Change</option>
                    <option value="MAJOR">Major Change</option>
                  </Select>
                </Field>
                <Field label="Location" id="locationName">
                  <Input id="locationName" {...register("locationName")} />
                </Field>
                <Field label="Purpose of Change" id="purposeOfChange">
                  <Input id="purposeOfChange" placeholder="Audit Compliance" {...register("purposeOfChange")} />
                </Field>
                <Field label="Change Category" id="changeCategory">
                  <Input id="changeCategory" placeholder="Document Revision: SOP, WI, Learning Content, Protocol" {...register("changeCategory")} />
                </Field>
                <Field label="Reg Mandate Effective Date" id="regulatoryMandateEffectiveDate">
                  <Input id="regulatoryMandateEffectiveDate" type="date" {...register("regulatoryMandateEffectiveDate")} />
                </Field>
                <Field label="Source of Regulatory Mandate" id="regulatoryMandateSource">
                  <Input id="regulatoryMandateSource" {...register("regulatoryMandateSource")} />
                </Field>
                <Field label="Related Market" id="relatedMarket">
                  <Input id="relatedMarket" {...register("relatedMarket")} />
                </Field>
                <Field label="Related Customer" id="relatedCustomer">
                  <Input id="relatedCustomer" {...register("relatedCustomer")} />
                </Field>
              </div>
            </Section>

            <Section title="Product, Equipment, and Document Details">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Field label="Vendor Code" id="vendorCode"><Input id="vendorCode" {...register("vendorCode")} /></Field>
                <Field label="Vendor Name" id="vendorName"><Input id="vendorName" {...register("vendorName")} /></Field>
                <Field label="Product/Item Code" id="productItemCode"><Input id="productItemCode" {...register("productItemCode")} /></Field>
                <Field label="Product/Item Description" id="productItemDescription"><Input id="productItemDescription" {...register("productItemDescription")} /></Field>
                <Field label="Equipment ID Number" id="equipmentIdNumber"><Input id="equipmentIdNumber" {...register("equipmentIdNumber")} /></Field>
                <Field label="Equipment Name" id="equipmentName"><Input id="equipmentName" {...register("equipmentName")} /></Field>
                <Field label="Document Name" id="documentName"><Input id="documentName" placeholder="PROCEDURE FOR WAREHOUSE OPERATIONS" {...register("documentName")} /></Field>
                <Field label="Document No." id="documentNumber"><Input id="documentNumber" placeholder="UC/WH/001" {...register("documentNumber")} /></Field>
              </div>
            </Section>

            <Section title="Current Status and Proposed Change">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Field label="Brief of Current Status *" id="description" error={errors.description?.message}>
                  <Textarea id="description" rows={6} {...register("description")} aria-invalid={!!errors.description} />
                </Field>
                <Field label="Brief of Proposed Change *" id="proposedChangeBrief" error={errors.proposedChangeBrief?.message}>
                  <Textarea id="proposedChangeBrief" rows={6} {...register("proposedChangeBrief")} aria-invalid={!!errors.proposedChangeBrief} />
                </Field>
                <Field label="Justification or Rationale *" id="justification" error={errors.justification?.message}>
                  <Textarea id="justification" rows={4} {...register("justification")} aria-invalid={!!errors.justification} />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Type of Change" id="changeNature">
                    <Select id="changeNature" {...register("changeNature")}>
                      <option value="Permanent">Permanent</option>
                      <option value="Temporary">Temporary</option>
                    </Select>
                  </Field>
                  <Field label="Expected Completion" id="targetImplementationDate">
                    <Input id="targetImplementationDate" type="date" {...register("targetImplementationDate")} />
                  </Field>
                  <Field label="Temporary Period / Events" id="temporaryChangePeriod" className="sm:col-span-2">
                    <Input id="temporaryChangePeriod" {...register("temporaryChangePeriod")} />
                  </Field>
                </div>
              </div>
            </Section>
          </>
        )}

        {stage === "impact" && (
          <>
            <Section title="Ownership and Department Involvement">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Field label="Change Owner" id="changeOwner"><Input id="changeOwner" {...register("changeOwner")} /></Field>
                <Field label="HOD of Change Owner" id="changeOwnerHod"><Input id="changeOwnerHod" {...register("changeOwnerHod")} /></Field>
                <Field label="QA Responsible" id="qaResponsible"><Input id="qaResponsible" {...register("qaResponsible")} /></Field>
                <label className="flex items-end gap-2 pb-2 text-body">
                  <input type="checkbox" className="h-4 w-4" {...register("effectivenessCheckRequired")} />
                  Effectiveness check required
                </label>
                <Field label="Necessary Departments" id="involvedDepartmentsText" className="lg:col-span-4">
                  <Textarea id="involvedDepartmentsText" rows={3} placeholder="Warehouse, Quality Assurance, Training" {...register("involvedDepartmentsText")} />
                </Field>
              </div>
            </Section>

            <Section title="Impact Assessment">
              <div className="space-y-3">
                {impactTasks.map((task, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 lg:grid-cols-[80px_1.2fr_150px_1.4fr_180px_160px_40px]">
                    <Field label="#" id={`checkpoint-${index}`}>
                      <Input value={task.checkpointNo ?? index + 1} onChange={(e) => updateTask(index, { checkpointNo: Number(e.target.value) || index + 1 })} />
                    </Field>
                    <Field label="Check Point" id={`impact-${index}`}>
                      <Input value={task.impactArea ?? ""} onChange={(e) => updateTask(index, { impactArea: e.target.value })} />
                    </Field>
                    <Field label="Applicability" id={`app-${index}`}>
                      <Select value={task.applicability ?? ""} onChange={(e) => updateTask(index, { applicability: e.target.value })}>
                        <option value="Applicable">Applicable</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </Select>
                    </Field>
                    <Field label="Proposed Task" id={`task-${index}`}>
                      <Input value={task.proposedTask ?? ""} onChange={(e) => updateTask(index, { proposedTask: e.target.value })} />
                    </Field>
                    <Field label="Assignee" id={`assignee-${index}`}>
                      <Input value={task.taskAssignee ?? ""} onChange={(e) => updateTask(index, { taskAssignee: e.target.value })} />
                    </Field>
                    <Field label="Remarks" id={`remarks-${index}`}>
                      <Input value={task.remarks ?? ""} onChange={(e) => updateTask(index, { remarks: e.target.value })} />
                    </Field>
                    <button type="button" className="mt-6 rounded p-2 text-muted-foreground hover:bg-error/10 hover:text-error" onClick={() => removeTask(index)} aria-label="Remove checkpoint">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTask}>
                  <Plus className="h-4 w-4" />
                  Add Checkpoint
                </Button>
              </div>
            </Section>
          </>
        )}

        {stage === "qa" && (
          <>
            <Section title="QA Assessment">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="Requirement of RAD Assessment" id="radAssessmentRequired"><Input id="radAssessmentRequired" {...register("radAssessmentRequired")} /></Field>
                <Field label="Requirement of Customer/CG Assessment" id="customerCgAssessmentRequired"><Input id="customerCgAssessmentRequired" {...register("customerCgAssessmentRequired")} /></Field>
                <Field label="QA Assessment On" id="qaAssessmentOn"><Input id="qaAssessmentOn" type="date" {...register("qaAssessmentOn")} /></Field>
                <Field label="QA Assessment By" id="qaAssessmentBy"><Input id="qaAssessmentBy" {...register("qaAssessmentBy")} /></Field>
                <Field label="Internal Customer" id="internalCustomer"><Input id="internalCustomer" {...register("internalCustomer")} /></Field>
                <Field label="Change Acceptance" id="changeAcceptance"><Input id="changeAcceptance" {...register("changeAcceptance")} /></Field>
                <Field label="Customer/CG Comments" id="customerCgComments" className="lg:col-span-3"><Textarea id="customerCgComments" rows={3} {...register("customerCgComments")} /></Field>
                <Field label="Comment by QA" id="qaComment" className="lg:col-span-3"><Textarea id="qaComment" rows={3} {...register("qaComment")} /></Field>
              </div>
            </Section>

            <Section title="Review and Authorization">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="Recommendations" id="recommendations" className="lg:col-span-3"><Textarea id="recommendations" rows={3} {...register("recommendations")} /></Field>
                <Field label="QP Comments" id="qpComments" className="lg:col-span-3"><Textarea id="qpComments" rows={3} {...register("qpComments")} /></Field>
                <Field label="Variation Classification" id="variationClassification"><Input id="variationClassification" {...register("variationClassification")} /></Field>
                <Field label="Documents Requested For Filing" id="documentsRequestedForFiling"><Input id="documentsRequestedForFiling" {...register("documentsRequestedForFiling")} /></Field>
                <Field label="Recommendation For Release" id="recommendationForRelease"><Input id="recommendationForRelease" {...register("recommendationForRelease")} /></Field>
                <Field label="Other Recommendations" id="otherRecommendations" className="lg:col-span-3"><Textarea id="otherRecommendations" rows={3} {...register("otherRecommendations")} /></Field>
                <Field label="Assessment by RAD" id="radAssessment" className="lg:col-span-3"><Textarea id="radAssessment" rows={3} {...register("radAssessment")} /></Field>
                <Field label="Review by Other Departments" id="otherDepartmentsReview" className="lg:col-span-3"><Textarea id="otherDepartmentsReview" rows={3} {...register("otherDepartmentsReview")} /></Field>
                <Field label="Final Decision by QA" id="finalQaDecision"><Input id="finalQaDecision" {...register("finalQaDecision")} /></Field>
                <Field label="Date of QA Review" id="qaReviewDate"><Input id="qaReviewDate" type="date" {...register("qaReviewDate")} /></Field>
                <Field label="QA Reviewer" id="qaReviewer"><Input id="qaReviewer" {...register("qaReviewer")} /></Field>
              </div>
            </Section>
          </>
        )}

        {stage === "closure" && (
          <Section title="Change Closure">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Field label="Implementation Details" id="implementationDetails" className="lg:col-span-3"><Textarea id="implementationDetails" rows={4} {...register("implementationDetails")} /></Field>
              <Field label="Change Implementation Review" id="implementationReview" className="lg:col-span-3"><Textarea id="implementationReview" rows={4} {...register("implementationReview")} /></Field>
              <Field label="Action Confirmation Comment" id="actionConfirmationComment" className="lg:col-span-3"><Textarea id="actionConfirmationComment" rows={3} {...register("actionConfirmationComment")} /></Field>
              <Field label="Change Effective Date" id="changeEffectiveDate"><Input id="changeEffectiveDate" type="date" {...register("changeEffectiveDate")} /></Field>
              <Field label="Batch Number / AR Number" id="batchArNumber"><Input id="batchArNumber" {...register("batchArNumber")} /></Field>
              <Field label="Closed By" id="closedByName"><Input id="closedByName" {...register("closedByName")} /></Field>
              <Field label="Product/Material Code" id="productMaterialCode"><Input id="productMaterialCode" {...register("productMaterialCode")} /></Field>
              <Field label="Product Name / Material Name" id="productMaterialName"><Input id="productMaterialName" {...register("productMaterialName")} /></Field>
              <Field label="Closure Remarks" id="closureRemarks" className="lg:col-span-3"><Textarea id="closureRemarks" rows={4} {...register("closureRemarks")} /></Field>
            </div>
          </Section>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "draft"))}>
            {saveIntent === "draft" ? "Saving..." : "Save as Draft"}
          </Button>
          <Button type="button" disabled={busy} onClick={handleSubmit((v) => onSubmit(v, "review"))}>
            {saveIntent === "review" ? "Submitting..." : "Submit for QA Assessment"}
          </Button>
        </div>
      </form>
    </div>
  );

  function updateTask(index: number, patch: Partial<ChangeImpactTask>) {
    setImpactTasks((tasks) => tasks.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  }

  function addTask() {
    setImpactTasks((tasks) => [...tasks, { checkpointNo: tasks.length + 1, impactArea: "", applicability: "Applicable", proposedTask: "", taskAssignee: "", remarks: "" }]);
  }

  function removeTask(index: number) {
    setImpactTasks((tasks) => tasks.filter((_, i) => i !== index));
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="border-b border-border bg-muted/40">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, id, error, className, children }: { label: string; id: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-label text-error">{error}</p> : null}
    </div>
  );
}

function StageButton({ active, complete, icon, children, onClick }: { active: boolean; complete: boolean; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-body font-semibold transition-colors ${
        active ? "bg-brand-primary text-white" : "bg-background text-brand-primary ring-1 ring-border hover:bg-accent"
      }`}
    >
      {icon}
      {children}
      {complete ? <Badge variant={active ? "neutral" : "success"}>Done</Badge> : null}
    </button>
  );
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dateToIso(value?: string | null) {
  return value ? `${value}T00:00:00Z` : null;
}

function splitList(value?: string | null) {
  return (value ?? "")
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
