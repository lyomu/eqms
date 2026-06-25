"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  useOos,
  useOosTrail,
  useOosAction,
  useSaveContainment,
  useSaveLabAssessment,
  useAddInvestigationItem,
  useRemoveInvestigationItem,
  useAddRetestResample,
  useUpdateRetestResample,
  useSaveImpactAssessment,
  useSaveRootCause,
  useAddLinkedRecord,
  useRemoveLinkedRecord,
  useAddEvidence,
  useRemoveEvidence,
  useQaDispose,
  useReopenOos,
} from "@/hooks/useOos";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { OosStatusBadge } from "@/components/oos/OosStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  OOS_RECORD_TYPE_LABELS,
  OOS_SEVERITY_LABELS,
  OOS_SEVERITY_VARIANT,
  OOS_TEST_CATEGORY_LABELS,
  OOS_SAMPLE_TYPE_LABELS,
  OOS_QA_DECISION_LABELS,
  OOS_ROOT_CAUSE_CATEGORY_LABELS,
  LIKELY_CAUSE_LABELS,
  type OosCaseResponse,
  type OosDisposition,
  type OosStatus,
  type OosSeverity,
  type OosQaDecision,
  type OosRecordType,
} from "@/types/oos";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <dt className="text-label text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right text-body">{value ?? "—"}</dd>
    </div>
  );
}

function CheckRow({ label, value }: { label: string; value: boolean | null }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
      <span className="text-body">{label}</span>
      <Badge variant={value ? "success" : "neutral"}>{value ? "Yes" : "No"}</Badge>
    </div>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return <p className="text-body text-muted-foreground py-4 text-center">{message}</p>;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type ActionModal =
  | null
  | "assessment"
  | "labAssessment"
  | "investigation"
  | "containment"
  | "investigationItem"
  | "retest"
  | "retestResult"
  | "impactAssessment"
  | "rootCause"
  | "linkedRecord"
  | "evidence"
  | "capa";

export default function OosDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const oos = useOos(id);
  const trail = useOosTrail(id);
  const action = useOosAction(id);
  const saveContainment = useSaveContainment(id);
  const saveLabAssessment = useSaveLabAssessment(id);
  const addItem = useAddInvestigationItem(id);
  const removeItem = useRemoveInvestigationItem(id);
  const addRetest = useAddRetestResample(id);
  const saveImpact = useSaveImpactAssessment(id);
  const saveRootCause = useSaveRootCause(id);
  const addLinkedRecord = useAddLinkedRecord(id);
  const removeLinkedRecord = useRemoveLinkedRecord(id);
  const addEvidence = useAddEvidence(id);
  const removeEvidence = useRemoveEvidence(id);
  const qaDispose = useQaDispose(id);
  const reopenOos = useReopenOos(id);

  const [activeTab, setActiveTab] = useState("overview");
  const [modal, setModal] = useState<ActionModal>(null);
  const [dispoOpen, setDispoOpen] = useState(false);
  const [qaDisposeOpen, setQaDisposeOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [disposition, setDisposition] = useState<OosDisposition>("ACCEPT");
  const [qaDecision, setQaDecision] = useState<OosQaDecision>("ACCEPT");
  const [rationale, setRationale] = useState("");
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const updateRetest = useUpdateRetestResample(id, selectedTestId ?? 0);

  if (oos.isLoading) return <LoadingScreen label="Loading OOS case…" />;
  if (oos.isError || !oos.data) return <ErrorAlert title="Error" message="Failed to load this OOS case." />;
  const o = oos.data;

  function simple(path: string, reason?: string) {
    action.mutate(
      { path, body: { expectedVersion: o.version, reason: reason ?? path } },
      { onSuccess: () => toast.success("Done") }
    );
  }

  const isPending = action.isPending || saveContainment.isPending || saveLabAssessment.isPending || addItem.isPending;

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "result", label: "Result Details" },
    { key: "containment", label: "Containment" },
    { key: "lab-assessment", label: "Lab Assessment" },
    { key: "investigation", label: "Investigation", count: o.investigationItems?.length },
    { key: "retest", label: "Retest / Resample", count: o.retestResample?.length },
    { key: "impact", label: "Impact Assessment" },
    { key: "root-cause", label: "Root Cause & CAPA" },
    { key: "disposition", label: "QA Disposition" },
    { key: "linked", label: "Linked Records", count: (o.linkedRecords?.length ?? 0) + (o.linkedCapaIds?.length ?? 0) },
    { key: "evidence", label: "Evidence", count: o.evidence?.length },
    { key: "audit", label: "Audit Trail" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/oos" className="hover:underline">OOS Register</Link>
            <span>/</span>
            <span>{o.oosNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{o.title ?? o.oosNo}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <OosStatusBadge status={o.status} />
            {o.severity && (
              <Badge variant={OOS_SEVERITY_VARIANT[o.severity as OosSeverity] ?? "neutral"}>
                {OOS_SEVERITY_LABELS[o.severity as OosSeverity] ?? o.severity}
              </Badge>
            )}
            {o.recordType && (
              <Badge variant="neutral">
                {OOS_RECORD_TYPE_LABELS[o.recordType as OosRecordType] ?? o.recordType}
              </Badge>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <WorkflowActions o={o} isPending={isPending}
            onSimple={simple}
            onDetermineDisposition={() => setDispoOpen(true)}
            onQaDispose={() => setQaDisposeOpen(true)}
            onClose={() => setCloseOpen(true)}
            onReopen={() => setReopenOpen(true)}
            onModal={setModal}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Identification</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-0">
                <Field label="OOS No." value={<span className="font-medium">{o.oosNo}</span>} />
                <Field label="Status" value={<OosStatusBadge status={o.status} />} />
                <Field label="Record Type" value={o.recordType ? OOS_RECORD_TYPE_LABELS[o.recordType as OosRecordType] ?? o.recordType : null} />
                <Field label="Severity" value={o.severity ? OOS_SEVERITY_LABELS[o.severity as OosSeverity] ?? o.severity : null} />
                <Field label="Department" value={o.department} />
                <Field label="Laboratory" value={o.lab} />
                <Field label="Due Date" value={o.dueDate ? <span className={cn(new Date(o.dueDate) < new Date() && !["CLOSED","CANCELLED"].includes(o.status) ? "text-error font-semibold" : "")}>{formatDate(o.dueDate)}</span> : null} />
                <Field label="Reported Date" value={formatDate(o.reportedDate)} />
                <Field label="Reported By" value={o.reportedByName} />
                <Field label="Closed" value={formatDate(o.closedDate)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Test Summary</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-0">
                <Field label="Test Category" value={o.testCategory ? OOS_TEST_CATEGORY_LABELS[o.testCategory as keyof typeof OOS_TEST_CATEGORY_LABELS] ?? o.testCategory : null} />
                <Field label="Test Name" value={o.testName} />
                <Field label="Test Method" value={o.testMethod} />
                <Field label="Reported Result" value={<span className="font-semibold text-error">{o.reportedResult}</span>} />
                <Field label="Specification" value={`${o.specificationLimitMin ?? "—"} – ${o.specificationLimitMax ?? "—"} ${o.unitOfMeasure ?? ""}`.trim()} />
                <Field label="Specification Ref." value={o.specificationReference} />
                <Field label="Batch / Lot" value={o.batchId} />
                <Field label="Sample ID" value={o.sampleId} />
                <Field label="Sample Type" value={o.sampleType ? OOS_SAMPLE_TYPE_LABELS[o.sampleType as keyof typeof OOS_SAMPLE_TYPE_LABELS] ?? o.sampleType : null} />
              </dl>
            </CardContent>
          </Card>

          {o.description && (
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-body">{o.description}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Result Details */}
      {activeTab === "result" && (
        <Card>
          <CardHeader><CardTitle>Result Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <Field label="Equipment ID" value={o.equipmentId} />
              <Field label="Calibration Status at Test" value={o.calibrationStatusAtTest} />
              <Field label="Reagent Used" value={o.reagentUsed} />
              <Field label="Reagent Lot No." value={o.reagentLot} />
              <Field label="Reference Standard Lot" value={o.referenceStdLot} />
              <Field label="Trend Limit" value={o.trendLimit} />
              <Field label="Analyst ID" value={o.analystId} />
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Containment */}
      {activeTab === "containment" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Immediate Containment</h2>
            <Button size="sm" onClick={() => setModal("containment")}>
              {o.containment ? "Update Containment" : "Record Containment"}
            </Button>
          </div>
          {o.containment ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Hold Status</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-0">
                    <Field label="Hold Required" value={<Badge variant={o.containment.holdRequired ? "error" : "neutral"}>{o.containment.holdRequired ? "Yes" : "No"}</Badge>} />
                    <Field label="Hold Type" value={o.containment.holdType} />
                    <Field label="Hold Target" value={o.containment.holdTarget} />
                    <Field label="Target Reference" value={o.containment.targetReference} />
                    <Field label="Hold Reason" value={o.containment.holdReason} />
                    <Field label="Hold Applied At" value={formatDate(o.containment.holdAppliedAt)} />
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Immediate Actions & Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {o.containment.immediateActions && (
                    <div>
                      <p className="text-label text-muted-foreground">Immediate Actions Taken</p>
                      <p className="mt-1 whitespace-pre-wrap text-body">{o.containment.immediateActions}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <CheckRow label="Notification Issued" value={o.containment.notificationIssued} />
                    <CheckRow label="Regulatory Notification Required" value={o.containment.regulatoryNotificationRequired} />
                    <CheckRow label="Customer Notification Required" value={o.containment.customerNotificationRequired} />
                  </div>
                  {o.containment.notes && <p className="text-label text-muted-foreground">{o.containment.notes}</p>}
                  <div>
                    <Badge variant="neutral">{o.containment.containmentStatus}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent><SectionEmpty message="No containment actions recorded yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Lab Assessment */}
      {activeTab === "lab-assessment" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Initial Lab Assessment</h2>
            <Button size="sm" onClick={() => setModal("labAssessment")}>
              {o.initialAssessment ? "Update Assessment" : "Record Assessment"}
            </Button>
          </div>
          {o.initialAssessment ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Assessment Outcome</CardTitle></CardHeader>
                <CardContent>
                  {o.initialAssessment.likelyCause && (
                    <div className="mb-3">
                      <p className="text-label text-muted-foreground">Likely Cause</p>
                      <Badge variant="info" className="mt-1">
                        {LIKELY_CAUSE_LABELS[o.initialAssessment.likelyCause as keyof typeof LIKELY_CAUSE_LABELS] ?? o.initialAssessment.likelyCause}
                      </Badge>
                    </div>
                  )}
                  {o.initialAssessment.assessmentOutcome && (
                    <div className="mb-3">
                      <p className="text-label text-muted-foreground">Assessment Outcome</p>
                      <Badge variant={o.initialAssessment.assessmentOutcome === "LAB_ERROR_CONFIRMED" ? "success" : o.initialAssessment.assessmentOutcome === "INCONCLUSIVE" ? "warning" : "error"}>
                        {o.initialAssessment.assessmentOutcome.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  )}
                  {o.initialAssessment.assessmentFindings && (
                    <div>
                      <p className="text-label text-muted-foreground">Findings</p>
                      <p className="mt-1 whitespace-pre-wrap text-body">{o.initialAssessment.assessmentFindings}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Checklist</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <CheckRow label="Lab Error Suspected" value={o.initialAssessment.labErrorSuspected} />
                  <CheckRow label="Correct Sample Tested" value={o.initialAssessment.correctSampleTested} />
                  <CheckRow label="Correct Test Method Used" value={o.initialAssessment.correctTestMethodUsed} />
                  <CheckRow label="Correct Specification Applied" value={o.initialAssessment.correctSpecificationApplied} />
                  <CheckRow label="Calculations Checked" value={o.initialAssessment.calculationsChecked} />
                  <CheckRow label="System Suitability Checked" value={o.initialAssessment.systemSuitabilityChecked} />
                  <CheckRow label="Instrument Calibration Valid" value={o.initialAssessment.instrumentCalibrationValid} />
                  <CheckRow label="Reagents / Standards Valid" value={o.initialAssessment.reagentsStandardsValid} />
                  <CheckRow label="Analyst Followed Procedure" value={o.initialAssessment.analystFollowedProcedure} />
                  <CheckRow label="Raw Data Reviewed" value={o.initialAssessment.rawDataReviewed} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent><SectionEmpty message="No lab assessment recorded yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Investigation */}
      {activeTab === "investigation" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Investigation Items</h2>
            <Button size="sm" onClick={() => setModal("investigationItem")}>Add Item</Button>
          </div>
          {(o.investigationItems?.length ?? 0) > 0 ? (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-label text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">#</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Description</th>
                      <th className="px-4 py-2 font-semibold">Finding</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.investigationItems?.map((item) => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="px-4 py-2 text-label text-muted-foreground">{item.itemNumber}</td>
                        <td className="px-4 py-2 text-label">{item.itemType?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 max-w-[200px] truncate">{item.description}</td>
                        <td className="px-4 py-2 max-w-[200px] text-label">{item.finding ?? "—"}</td>
                        <td className="px-4 py-2"><Badge variant={item.itemStatus === "CLOSED" ? "success" : "neutral"}>{item.itemStatus}</Badge></td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="sm" onClick={() => removeItem.mutate(item.id, { onSuccess: () => toast.success("Item removed") })}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent><SectionEmpty message="No investigation items recorded yet." /></CardContent></Card>
          )}
          {o.investigation && (
            <Card>
              <CardHeader><CardTitle>Investigation Summary</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-0">
                  <Field label="Status" value={o.investigation.investigationStatus?.replace(/_/g, " ")} />
                  <Field label="Scope" value={o.investigation.investigationScope} />
                  <Field label="Start Date" value={formatDate(o.investigation.investigationStartDate)} />
                  <Field label="Due Date" value={formatDate(o.investigation.investigationDueDate)} />
                  {o.investigation.investigationFindings && (
                    <div className="py-2">
                      <p className="text-label text-muted-foreground">Findings</p>
                      <p className="mt-1 whitespace-pre-wrap text-body">{o.investigation.investigationFindings}</p>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Retest / Resample */}
      {activeTab === "retest" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Retest / Resample Records</h2>
            <Button size="sm" onClick={() => setModal("retest")}>Add Retest / Resample</Button>
          </div>
          {(o.retestResample?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {o.retestResample?.map((test) => (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{test.testType} #{test.testNumber}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={test.testStatus === "COMPLETED" ? (test.resultPass ? "success" : "error") : "warning"}>
                          {test.testStatus}
                        </Badge>
                        {test.resultPass !== null && test.resultPass !== undefined && (
                          <Badge variant={test.resultPass ? "success" : "error"}>{test.resultPass ? "PASS" : "FAIL"}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-0">
                      <Field label="Ordered" value={formatDate(test.orderedDate)} />
                      <Field label="Rationale" value={test.rationale} />
                      <Field label="Sample Reference" value={test.sampleReference} />
                      <Field label="Result" value={test.result ? <span className={test.resultPass ? "text-success font-medium" : "text-error font-medium"}>{test.result}</span> : null} />
                      <Field label="Equipment" value={test.equipmentUsed} />
                      <Field label="Analyst Comments" value={test.analystComments} />
                    </dl>
                    {test.testStatus === "PENDING" && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedTestId(test.id); setModal("retestResult"); }}
                        >
                          Record Result
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent><SectionEmpty message="No retest or resample records yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Impact Assessment */}
      {activeTab === "impact" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Impact Assessment</h2>
            <Button size="sm" onClick={() => setModal("impactAssessment")}>
              {o.impactAssessment ? "Update Assessment" : "Record Impact"}
            </Button>
          </div>
          {o.impactAssessment ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Scope of Impact</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-0">
                    <Field label="Scope" value={o.impactAssessment.scopeOfImpact} />
                    <Field label="Batches Potentially Affected" value={o.impactAssessment.batchesPotentiallyAffected} />
                    <Field label="Products Potentially Affected" value={o.impactAssessment.productsPotentiallyAffected} />
                    <Field label="Patient Safety Risk" value={o.impactAssessment.patientSafetyRisk?.replace(/_/g, " ")} />
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Actions Required</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <CheckRow label="Released Product Impact" value={o.impactAssessment.releasedProductImpact} />
                  <CheckRow label="Customer Impact" value={o.impactAssessment.customerImpact} />
                  <CheckRow label="Regulatory Impact" value={o.impactAssessment.regulatoryImpact} />
                  <CheckRow label="Quarantine Required" value={o.impactAssessment.quarantineRequired} />
                  <CheckRow label="Recall Required" value={o.impactAssessment.recallRequired} />
                  <CheckRow label="Authority Notification Required" value={o.impactAssessment.authorityNotificationRequired} />
                </CardContent>
              </Card>
              {o.impactAssessment.riskJustification && (
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle>Risk Justification</CardTitle></CardHeader>
                  <CardContent><p className="whitespace-pre-wrap text-body">{o.impactAssessment.riskJustification}</p></CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card><CardContent><SectionEmpty message="No impact assessment recorded yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Root Cause & CAPA */}
      {activeTab === "root-cause" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Root Cause Analysis</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setModal("capa")}>Create CAPA</Button>
              <Button size="sm" onClick={() => setModal("rootCause")}>
                {o.rootCause ? "Update Root Cause" : "Record Root Cause"}
              </Button>
            </div>
          </div>
          {o.rootCause ? (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <dl className="space-y-0">
                  <Field label="Root Cause Category" value={o.rootCause.rootCauseCategory ? OOS_ROOT_CAUSE_CATEGORY_LABELS[o.rootCause.rootCauseCategory as keyof typeof OOS_ROOT_CAUSE_CATEGORY_LABELS] ?? o.rootCause.rootCauseCategory : null} />
                  <Field label="Method Used" value={o.rootCause.rootCauseMethod?.replace(/_/g, " ")} />
                  <Field label="Systematic Issue" value={<Badge variant={o.rootCause.systematicIssue ? "error" : "success"}>{o.rootCause.systematicIssue ? "Yes" : "No"}</Badge>} />
                </dl>
                {o.rootCause.rootCauseDescription && (
                  <div>
                    <p className="text-label text-muted-foreground">Root Cause Description</p>
                    <p className="mt-1 whitespace-pre-wrap text-body">{o.rootCause.rootCauseDescription}</p>
                  </div>
                )}
                {o.rootCause.immediateCause && (
                  <div>
                    <p className="text-label text-muted-foreground">Immediate Cause</p>
                    <p className="mt-1 text-body">{o.rootCause.immediateCause}</p>
                  </div>
                )}
                {o.rootCause.contributingFactors && (
                  <div>
                    <p className="text-label text-muted-foreground">Contributing Factors</p>
                    <p className="mt-1 text-body">{o.rootCause.contributingFactors}</p>
                  </div>
                )}
                {o.rootCause.recurrencePrevention && (
                  <div>
                    <p className="text-label text-muted-foreground">Recurrence Prevention</p>
                    <p className="mt-1 text-body">{o.rootCause.recurrencePrevention}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent><SectionEmpty message="No root cause analysis recorded yet." /></CardContent></Card>
          )}
          {o.linkedCapaIds && o.linkedCapaIds.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Linked CAPAs</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {o.linkedCapaIds.map((cid) => (
                    <li key={cid}>
                      <Link href={`/capa/${cid}`} className="text-brand-secondary hover:underline">CAPA #{cid}</Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* QA Disposition */}
      {activeTab === "disposition" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">QA Disposition Decision</h2>
            {o.status === "DISPOSITION_PENDING" && (
              <Button size="sm" onClick={() => setQaDisposeOpen(true)}>Record QA Disposition</Button>
            )}
          </div>
          {o.disposition ? (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center gap-3">
                  <Badge variant={o.disposition.disposition === "REJECT" || o.disposition.disposition === "DESTROY" ? "error" : o.disposition.disposition === "ACCEPT" ? "success" : "warning"} className="text-body">
                    {OOS_QA_DECISION_LABELS[o.disposition.disposition as OosQaDecision] ?? o.disposition.disposition}
                  </Badge>
                  {o.disposition.qaDecision && o.disposition.qaDecision !== o.disposition.disposition && (
                    <Badge variant="neutral">{OOS_QA_DECISION_LABELS[o.disposition.qaDecision] ?? o.disposition.qaDecision}</Badge>
                  )}
                </div>
                <dl className="space-y-0">
                  <Field label="Rationale" value={o.disposition.rationale} />
                  <Field label="Final Conclusion" value={o.disposition.finalConclusion} />
                  <Field label="Affected Lots" value={o.disposition.affectedLots} />
                  <Field label="Conditions of Release" value={o.disposition.conditionsOfRelease} />
                  <Field label="Approved By" value={o.disposition.approvedBy} />
                  <Field label="Approved Date" value={formatDate(o.disposition.approvedDate)} />
                </dl>
                {o.disposition.closureComments && (
                  <div>
                    <p className="text-label text-muted-foreground">Closure Comments</p>
                    <p className="mt-1 text-body">{o.disposition.closureComments}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent><SectionEmpty message="No disposition decision recorded yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Linked Records */}
      {activeTab === "linked" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Linked Records</h2>
            <Button size="sm" onClick={() => setModal("linkedRecord")}>Link Record</Button>
          </div>
          {(o.linkedRecords?.length ?? 0) > 0 || (o.linkedCapaIds?.length ?? 0) > 0 ? (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-label text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Reference</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.linkedCapaIds?.map((cid) => (
                      <tr key={`capa-${cid}`} className="border-b border-border/50">
                        <td className="px-4 py-2 text-label">CAPA</td>
                        <td className="px-4 py-2"><Link href={`/capa/${cid}`} className="text-brand-secondary hover:underline">CAPA #{cid}</Link></td>
                        <td className="px-4 py-2">—</td>
                        <td className="px-4 py-2">—</td>
                        <td className="px-4 py-2">—</td>
                      </tr>
                    ))}
                    {o.linkedRecords?.map((lr) => (
                      <tr key={lr.id} className="border-b border-border/50">
                        <td className="px-4 py-2 text-label">{lr.linkedRecordType?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 font-medium">{lr.linkedRecordReference ?? lr.linkedRecordId}</td>
                        <td className="px-4 py-2 max-w-[200px] truncate">{lr.linkedRecordTitle ?? "—"}</td>
                        <td className="px-4 py-2 text-label">{lr.linkedRecordStatus ?? "—"}</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="sm" onClick={() => removeLinkedRecord.mutate(lr.id, { onSuccess: () => toast.success("Removed") })}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent><SectionEmpty message="No linked records yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Evidence */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-h2">Documents & Evidence</h2>
            <Button size="sm" onClick={() => setModal("evidence")}>Add Evidence</Button>
          </div>
          {(o.evidence?.length ?? 0) > 0 ? (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-label text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">#</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Title</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold">Submitted</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.evidence?.map((ev) => (
                      <tr key={ev.id} className="border-b border-border/50">
                        <td className="px-4 py-2 text-label text-muted-foreground">{ev.evidenceNumber}</td>
                        <td className="px-4 py-2 text-label">{ev.evidenceType?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-2 font-medium">{ev.title}</td>
                        <td className="px-4 py-2"><Badge variant={ev.evidenceStatus === "ACCEPTED" ? "success" : ev.evidenceStatus === "REJECTED" ? "error" : "neutral"}>{ev.evidenceStatus?.replace(/_/g, " ")}</Badge></td>
                        <td className="px-4 py-2 text-label text-muted-foreground">{formatDate(ev.submittedDate)}</td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="sm" onClick={() => removeEvidence.mutate(ev.id, { onSuccess: () => toast.success("Removed") })}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent><SectionEmpty message="No evidence records yet." /></CardContent></Card>
          )}
        </div>
      )}

      {/* Audit Trail */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
          <CardContent>
            <AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} />
          </CardContent>
        </Card>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────────── */}

      {/* Initial Lab Assessment */}
      <ActionFormModal
        open={modal === "labAssessment"} onOpenChange={(open) => !open && setModal(null)}
        title="Initial Lab Assessment" isPending={saveLabAssessment.isPending} successMessage="Lab assessment saved"
        fields={[
          { name: "assessmentFindings", label: "Assessment Findings *", type: "textarea", required: true },
          { name: "likelyCause", label: "Likely Cause", type: "select", options: Object.entries(LIKELY_CAUSE_LABELS).map(([v, l]) => ({ value: v, label: l })) },
          { name: "assessmentOutcome", label: "Outcome", type: "select", options: [{ value: "LAB_ERROR_CONFIRMED", label: "Lab Error Confirmed" }, { value: "NO_LAB_ERROR_FOUND", label: "No Lab Error Found" }, { value: "INCONCLUSIVE", label: "Inconclusive" }] },
          { name: "assessmentComments", label: "Comments", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await saveLabAssessment.mutateAsync({ expectedVersion: o.version, assessmentFindings: v.assessmentFindings, likelyCause: v.likelyCause || undefined, assessmentOutcome: v.assessmentOutcome || undefined, assessmentComments: v.assessmentComments || undefined });
          toast.success("Lab assessment saved");
        }}
      />

      {/* Containment */}
      <ActionFormModal
        open={modal === "containment"} onOpenChange={(open) => !open && setModal(null)}
        title="Record Containment" isPending={saveContainment.isPending} successMessage="Containment saved"
        fields={[
          { name: "immediateActions", label: "Immediate Actions Taken", type: "textarea" },
          { name: "holdReason", label: "Hold Reason", type: "text" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await saveContainment.mutateAsync({ holdRequired: false, notificationIssued: false, regulatoryNotificationRequired: false, customerNotificationRequired: false, immediateActions: v.immediateActions || undefined, holdReason: v.holdReason || undefined, notes: v.notes || undefined });
          toast.success("Containment saved");
        }}
      />

      {/* Investigation Item */}
      <ActionFormModal
        open={modal === "investigationItem"} onOpenChange={(open) => !open && setModal(null)}
        title="Add Investigation Item" isPending={addItem.isPending} successMessage="Item added"
        fields={[
          { name: "itemType", label: "Item Type", type: "select", options: [{ value: "OBSERVATION", label: "Observation" }, { value: "FINDING", label: "Finding" }, { value: "TEST_RESULT", label: "Test Result" }, { value: "WITNESS_STATEMENT", label: "Witness Statement" }, { value: "EQUIPMENT_CHECK", label: "Equipment Check" }, { value: "DOCUMENT_REVIEW", label: "Document Review" }] },
          { name: "description", label: "Description *", type: "textarea", required: true },
          { name: "finding", label: "Finding", type: "textarea" },
          { name: "source", label: "Source / Reference", type: "text" },
        ]}
        onSubmit={async (v) => {
          await addItem.mutateAsync({ itemType: v.itemType, description: v.description, finding: v.finding || undefined, source: v.source || undefined });
          toast.success("Investigation item added");
        }}
      />

      {/* Order Retest / Resample */}
      <ActionFormModal
        open={modal === "retest"} onOpenChange={(open) => !open && setModal(null)}
        title="Add Retest / Resample" isPending={addRetest.isPending} successMessage="Retest / resample ordered"
        fields={[
          { name: "testType", label: "Type *", type: "select", required: true, options: [{ value: "RETEST", label: "Retest" }, { value: "RESAMPLE", label: "Resample" }] },
          { name: "rationale", label: "Rationale", type: "textarea" },
          { name: "sampleReference", label: "Sample Reference", type: "text" },
        ]}
        onSubmit={async (v) => {
          await addRetest.mutateAsync({ testType: v.testType, rationale: v.rationale || undefined, sampleReference: v.sampleReference || undefined });
          toast.success("Retest / resample ordered");
        }}
      />

      {/* Record Retest Result */}
      <ActionFormModal
        open={modal === "retestResult"} onOpenChange={(open) => { if (!open) { setModal(null); setSelectedTestId(null); } }}
        title="Record Retest Result" isPending={updateRetest.isPending} successMessage="Result recorded"
        fields={[
          { name: "result", label: "Result Value", type: "text" },
          { name: "resultPass", label: "Overall Result", type: "select", options: [{ value: "true", label: "PASS" }, { value: "false", label: "FAIL" }] },
          { name: "analystComments", label: "Analyst Comments", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          if (!selectedTestId) return;
          await updateRetest.mutateAsync({ result: v.result || undefined, resultPass: v.resultPass === "true" ? true : v.resultPass === "false" ? false : undefined, analystComments: v.analystComments || undefined, testStatus: "COMPLETED" as const, expectedVersion: o.version });
          toast.success("Retest result recorded");
        }}
      />

      {/* Impact Assessment */}
      <ActionFormModal
        open={modal === "impactAssessment"} onOpenChange={(open) => !open && setModal(null)}
        title="Impact Assessment" isPending={saveImpact.isPending} successMessage="Impact assessment saved"
        fields={[
          { name: "scopeOfImpact", label: "Scope of Impact", type: "textarea" },
          { name: "batchesPotentiallyAffected", label: "Batches Potentially Affected", type: "text" },
          { name: "riskJustification", label: "Risk Justification", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await saveImpact.mutateAsync({ scopeOfImpact: v.scopeOfImpact || undefined, batchesPotentiallyAffected: v.batchesPotentiallyAffected || undefined, riskJustification: v.riskJustification || undefined, releasedProductImpact: false, customerImpact: false, regulatoryImpact: false, quarantineRequired: false, recallRequired: false, authorityNotificationRequired: false });
          toast.success("Impact assessment saved");
        }}
      />

      {/* Root Cause */}
      <ActionFormModal
        open={modal === "rootCause"} onOpenChange={(open) => !open && setModal(null)}
        title="Root Cause Analysis" isPending={saveRootCause.isPending} successMessage="Root cause saved"
        fields={[
          { name: "rootCauseCategory", label: "Root Cause Category", type: "select", options: Object.entries(OOS_ROOT_CAUSE_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l })) },
          { name: "rootCauseDescription", label: "Root Cause Description *", type: "textarea", required: true },
          { name: "rootCauseMethod", label: "Analysis Method", type: "select", options: [{ value: "FISHBONE", label: "Fishbone" }, { value: "FIVE_WHYS", label: "5 Whys" }, { value: "FMEA", label: "FMEA" }, { value: "FAULT_TREE", label: "Fault Tree" }, { value: "OTHER", label: "Other" }] },
          { name: "contributingFactors", label: "Contributing Factors", type: "textarea" },
          { name: "recurrencePrevention", label: "Recurrence Prevention", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await saveRootCause.mutateAsync({ expectedVersion: o.version, rootCauseCategory: v.rootCauseCategory || undefined, rootCauseDescription: v.rootCauseDescription, rootCauseMethod: v.rootCauseMethod || undefined, contributingFactors: v.contributingFactors || undefined, recurrencePrevention: v.recurrencePrevention || undefined, systematicIssue: false });
          toast.success("Root cause saved");
        }}
      />

      {/* Linked Record */}
      <ActionFormModal
        open={modal === "linkedRecord"} onOpenChange={(open) => !open && setModal(null)}
        title="Link Record" isPending={addLinkedRecord.isPending} successMessage="Record linked"
        fields={[
          { name: "linkedRecordType", label: "Record Type *", type: "select", required: true, options: [{ value: "CAPA", label: "CAPA" }, { value: "DEVIATION", label: "Deviation" }, { value: "CHANGE_CONTROL", label: "Change Control" }, { value: "COMPLAINT", label: "Complaint" }, { value: "AUDIT", label: "Audit" }, { value: "RISK", label: "Risk" }, { value: "BATCH_RECORD", label: "Batch Record" }] },
          { name: "linkedRecordReference", label: "Reference Number *", type: "text", required: true },
          { name: "linkedRecordTitle", label: "Title", type: "text" },
          { name: "notes", label: "Notes", type: "text" },
        ]}
        onSubmit={async (v) => {
          await addLinkedRecord.mutateAsync({ linkedRecordType: v.linkedRecordType, linkedRecordId: v.linkedRecordReference, linkedRecordReference: v.linkedRecordReference, linkedRecordTitle: v.linkedRecordTitle || undefined, notes: v.notes || undefined });
          toast.success("Record linked");
        }}
      />

      {/* Evidence */}
      <ActionFormModal
        open={modal === "evidence"} onOpenChange={(open) => !open && setModal(null)}
        title="Add Evidence" isPending={addEvidence.isPending} successMessage="Evidence added"
        fields={[
          { name: "evidenceType", label: "Evidence Type *", type: "select", required: true, options: [{ value: "CHROMATOGRAM", label: "Chromatogram" }, { value: "RAW_DATA", label: "Raw Data" }, { value: "PHOTO", label: "Photo" }, { value: "CALCULATION", label: "Calculation" }, { value: "LOGBOOK_ENTRY", label: "Logbook Entry" }, { value: "EQUIPMENT_LOG", label: "Equipment Log" }, { value: "WITNESS_STATEMENT", label: "Witness Statement" }, { value: "OTHER", label: "Other" }] },
          { name: "title", label: "Title / Description *", type: "text", required: true },
          { name: "description", label: "Details", type: "textarea" },
          { name: "fileName", label: "File Name (if applicable)", type: "text" },
        ]}
        onSubmit={async (v) => {
          await addEvidence.mutateAsync({ evidenceType: v.evidenceType, title: v.title, description: v.description || undefined, fileName: v.fileName || undefined });
          toast.success("Evidence added");
        }}
      />

      {/* Create CAPA */}
      <ActionFormModal
        open={modal === "capa"} onOpenChange={(open) => !open && setModal(null)}
        title="Create CAPA from OOS" isPending={isPending} successMessage="CAPA created"
        fields={[{ name: "description", label: "CAPA Description *", type: "textarea", required: true }]}
        onSubmit={async (v) => {
          await action.mutateAsync({ path: "create-capa", body: { description: v.description, effectivenessCheckRequired: false } });
          toast.success("CAPA created");
        }}
      />

      {/* Determine Disposition (signed) */}
      <SignatureModal
        open={dispoOpen}
        onOpenChange={(open) => { if (!open) { setRationale(""); } setDispoOpen(open); }}
        title="Determine Disposition"
        recordNumber={o.oosNo}
        recordTitle={o.title ?? o.reportedResult}
        recordNoun="OOS case"
        statusNode={<OosStatusBadge status={o.status} />}
        isPending={action.isPending}
        successMessage="Disposition determined"
        onSign={async (creds) => {
          await action.mutateAsync({ path: "determine-disposition", body: { expectedVersion: o.version, disposition, rationale: rationale || "See investigation", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement, reason: creds.reason } });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="dispo">Disposition Decision</Label>
          <Select id="dispo" value={disposition} onChange={(e) => setDisposition(e.target.value as OosDisposition)}>
            <option value="ACCEPT">Accept</option>
            <option value="REJECT">Reject</option>
            <option value="INVESTIGATE">Further Investigation</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rationale">Rationale</Label>
          <Textarea id="rationale" rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Justification for the disposition decision" />
        </div>
      </SignatureModal>

      {/* QA Dispose (signed) */}
      <SignatureModal
        open={qaDisposeOpen}
        onOpenChange={(open) => { if (!open) { setRationale(""); } setQaDisposeOpen(open); }}
        title="QA Disposition Decision"
        recordNumber={o.oosNo}
        recordTitle={o.title ?? o.reportedResult}
        recordNoun="OOS case"
        statusNode={<OosStatusBadge status={o.status} />}
        isPending={qaDispose.isPending}
        successMessage="QA disposition recorded"
        onSign={async (creds) => {
          await qaDispose.mutateAsync({ expectedVersion: o.version, disposition: qaDecision as OosDisposition, rationale: rationale || "QA disposition", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement, reason: creds.reason });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="qa-decision">QA Decision</Label>
          <Select id="qa-decision" value={qaDecision} onChange={(e) => setQaDecision(e.target.value as OosQaDecision)}>
            {(Object.keys(OOS_QA_DECISION_LABELS) as OosQaDecision[]).map((k) => (
              <option key={k} value={k}>{OOS_QA_DECISION_LABELS[k]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qa-rationale">Rationale</Label>
          <Textarea id="qa-rationale" rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="QA disposition rationale" />
        </div>
      </SignatureModal>

      {/* Close (signed) */}
      <SignatureModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close OOS Case"
        recordNumber={o.oosNo}
        recordTitle={o.title ?? o.reportedResult}
        recordNoun="OOS case"
        statusNode={<OosStatusBadge status={o.status} />}
        isPending={action.isPending}
        successMessage="OOS case closed"
        onSign={async (creds) => {
          await action.mutateAsync({ path: "close", body: { expectedVersion: o.version, reason: creds.reason || "Closed", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement } });
        }}
      />

      {/* Reopen (signed) */}
      <SignatureModal
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        title="Reopen OOS Case"
        recordNumber={o.oosNo}
        recordTitle={o.title ?? o.reportedResult}
        recordNoun="OOS case"
        statusNode={<OosStatusBadge status={o.status} />}
        isPending={reopenOos.isPending}
        successMessage="OOS case reopened"
        onSign={async (creds) => {
          await reopenOos.mutateAsync({ expectedVersion: o.version, reason: creds.reason || "Reopened", password: creds.password, totpCode: creds.totpCode, meaningStatement: creds.meaningStatement });
        }}
      />
    </div>
  );
}

// ─── Workflow Action Buttons ───────────────────────────────────────────────────

function WorkflowActions({
  o,
  isPending,
  onSimple,
  onDetermineDisposition,
  onQaDispose,
  onClose,
  onReopen,
  onModal,
}: {
  o: OosCaseResponse;
  isPending: boolean;
  onSimple: (path: string, reason?: string) => void;
  onDetermineDisposition: () => void;
  onQaDispose: () => void;
  onClose: () => void;
  onReopen: () => void;
  onModal: (m: ActionModal) => void;
}) {
  const status = o.status as OosStatus;

  return (
    <>
      {status === "REPORTED" && (
        <Button onClick={() => onModal("labAssessment")} disabled={isPending}>Record Lab Assessment</Button>
      )}
      {status === "INITIAL_ASSESSMENT" && (
        <>
          <Button variant="outline" onClick={() => onSimple("repeat-testing", "Repeat testing ordered")} disabled={isPending}>Order Repeat Test</Button>
          <Button onClick={() => onSimple("begin-investigation", "Investigation initiated")} disabled={isPending}>Begin Investigation</Button>
        </>
      )}
      {status === "INVESTIGATING" && (
        <>
          <Button variant="outline" onClick={() => onSimple("submit-for-qa-review", "Submitted for QA review")} disabled={isPending}>Submit for QA Review</Button>
          <Button variant="outline" onClick={() => onSimple("require-capa", "CAPA required")} disabled={isPending}>Require CAPA</Button>
          <Button onClick={onDetermineDisposition} disabled={isPending}>Determine Disposition</Button>
        </>
      )}
      {status === "QA_REVIEW" && (
        <>
          <Button variant="outline" onClick={() => onSimple("qa-order-retest", "QA ordered retest")} disabled={isPending}>Order Retest</Button>
          <Button variant="outline" onClick={() => onSimple("qa-order-resample", "QA ordered resample")} disabled={isPending}>Order Resample</Button>
          <Button onClick={() => onSimple("qa-approve-investigation", "QA approved investigation")} disabled={isPending}>Approve — Proceed to Disposition</Button>
        </>
      )}
      {(status === "RETEST_PENDING" || status === "RESAMPLE_PENDING") && (
        <Button onClick={() => onModal("retest")} disabled={isPending}>Record Retest / Resample Result</Button>
      )}
      {status === "AWAITING_REPEAT" && (
        <>
          <Button variant="outline" onClick={() => onModal("retest")} disabled={isPending}>Record Repeat Result</Button>
          <Button onClick={() => onSimple("begin-investigation", "Investigation initiated")} disabled={isPending}>Begin Investigation</Button>
        </>
      )}
      {status === "CAPA_REQUIRED" && (
        <Button onClick={() => onSimple("capa-complete-proceed", "CAPA completed — proceeding to disposition")} disabled={isPending}>CAPA Complete — Proceed</Button>
      )}
      {status === "DISPOSITION_PENDING" && (
        <Button onClick={onQaDispose} disabled={isPending}>QA Disposition Decision</Button>
      )}
      {status === "DISPOSITION_DETERMINED" && (
        <>
          <Button variant="outline" onClick={() => onModal("capa")} disabled={isPending}>Create CAPA</Button>
          <Button onClick={onClose} disabled={isPending}>Close Case</Button>
        </>
      )}
      {status === "CLOSED" && (
        <Button variant="outline" onClick={onReopen} disabled={isPending}>Reopen</Button>
      )}
      {(status === "DRAFT" || status === "REPORTED") && (
        <Button variant="outline" className="text-error hover:text-error" onClick={() => onSimple("cancel", "Cancelled")} disabled={isPending}>Cancel</Button>
      )}
    </>
  );
}
