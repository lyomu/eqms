"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import {
  useMaterial,
  useMaterialAudit,
  useMaterialTransition,
  useApproveMaterial,
  useMaterialLots,
  useMaterialSuppliers,
  useMaterialLedger,
  useMaterialQualityIssues,
  useAddSupplierLink,
  useRemoveSupplierLink,
  useReceiveMaterial,
  useReleaseLot,
  useRejectLot,
  useHoldLot,
  useDisposeLot,
  useIssueMaterial,
  useAddQualityIssueLink,
  useRemoveQualityIssueLink,
  type MaterialAction,
} from "@/hooks/useMaterial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { SignatureModal } from "@/components/common/SignatureModal";
import { ReasonModal } from "@/components/common/ReasonModal";
import { ActionFormModal, type FieldDef } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MATERIAL_STATUS_LABELS,
  MATERIAL_TYPE_LABELS,
  UOM_LABELS,
  LOT_STATUS_LABELS,
  MATERIAL_CATEGORY_LABELS,
  STORAGE_CONDITION_LABELS,
  materialStatusVariant,
  materialCriticalityVariant,
  lotStatusVariant,
  lotIsUsable,
  type MaterialResponse,
  type MaterialLot,
} from "@/types/material";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "overview" | "details" | "suppliers" | "lots" | "receiving" | "disposition" | "ledger" | "quality" | "trail";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "details", label: "Material Details" },
  { key: "suppliers", label: "Approved Suppliers" },
  { key: "lots", label: "Lots / Batches" },
  { key: "receiving", label: "Receiving" },
  { key: "disposition", label: "Release / Rejection" },
  { key: "ledger", label: "Inventory Ledger" },
  { key: "quality", label: "Quality Issues" },
  { key: "trail", label: "Audit Trail" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 font-medium">{value ?? "—"}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value ?? "—"}</p>
    </div>
  );
}

function YesNo({ value }: { value: boolean }) {
  return <span className={value ? "text-success font-medium" : "text-muted-foreground"}>
    {value ? "Yes" : "No"}
  </span>;
}

// ─── Main content ─────────────────────────────────────────────────────────────

function MaterialDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);

  const tab = (searchParams.get("tab") ?? "overview") as TabKey;
  function setTab(key: TabKey) {
    router.replace(`/materials/${id}?tab=${key}`);
  }

  // Queries
  const materialQ = useMaterial(id);
  const auditQ = useMaterialAudit(id);
  const lotsQ = useMaterialLots(id);
  const suppliersQ = useMaterialSuppliers(id);
  const ledgerQ = useMaterialLedger(id);
  const qualityQ = useMaterialQualityIssues(id);

  // Mutations
  const transition = useMaterialTransition();
  const approve = useApproveMaterial();
  const receiveMut = useReceiveMaterial(id);
  const addSupplierMut = useAddSupplierLink(id);
  const removeSupplierMut = useRemoveSupplierLink(id);
  const releaseLotMut = useReleaseLot(id);
  const rejectLotMut = useRejectLot(id);
  const holdLotMut = useHoldLot(id);
  const disposeLotMut = useDisposeLot(id);
  const issueMut = useIssueMaterial(id);
  const addQualityMut = useAddQualityIssueLink(id);
  const removeQualityMut = useRemoveQualityIssueLink(id);

  // Modal state
  const [approveOpen, setApproveOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState<{ action: MaterialAction; title: string; default: string } | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<MaterialLot | null>(null);
  const [lotAction, setLotAction] = useState<"release" | "reject" | "hold" | "dispose" | "issue" | null>(null);

  if (materialQ.isLoading) return <LoadingScreen label="Loading material…" />;
  if (materialQ.isError || !materialQ.data) return <ErrorAlert title="Error" message="Failed to load material." />;
  const m = materialQ.data;

  const lots = lotsQ.data ?? [];
  const quarantinedLots = lots.filter((l) => l.lotStatus === "QUARANTINED" || l.lotStatus === "SAMPLING_PENDING" || l.lotStatus === "UNDER_QC_TESTING" || l.lotStatus === "QA_REVIEW_PENDING");
  const releasedLots = lots.filter((l) => l.lotStatus === "RELEASED" || l.lotStatus === "CONDITIONALLY_RELEASED");
  const qualityLinks = qualityQ.data ?? [];
  const suppliers = suppliersQ.data ?? [];

  async function runTransition(action: MaterialAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action, expectedVersion: m.version, reason });
      toast.success("Done");
    } catch { /* interceptor surfaces errors */ }
  }

  async function runLotAction(reason: string) {
    if (!selectedLot || !lotAction) return;
    try {
      if (lotAction === "release") {
        await releaseLotMut.mutateAsync({ lotId: selectedLot.id, expectedVersion: 0, reason });
      } else if (lotAction === "reject") {
        await rejectLotMut.mutateAsync({ lotId: selectedLot.id, reason });
      } else if (lotAction === "hold") {
        await holdLotMut.mutateAsync({ lotId: selectedLot.id, reason });
      } else if (lotAction === "dispose") {
        await disposeLotMut.mutateAsync({ lotId: selectedLot.id, reason });
      }
      toast.success("Lot updated");
      setSelectedLot(null);
      setLotAction(null);
    } catch { /* handled */ }
  }

  const needsLotReasonModal = lotAction && lotAction !== "issue";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <p className="text-label text-muted-foreground">
            <Link href="/materials" className="hover:underline">Materials</Link>
            {" / "}
            <span>{m.materialCode}</span>
          </p>
          <h1 className="text-h1 text-brand-primary">{m.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={materialStatusVariant(m.status)}>{MATERIAL_STATUS_LABELS[m.status] ?? m.status}</Badge>
            <Badge variant="neutral">{MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType}</Badge>
            {m.criticality && (
              <Badge variant={materialCriticalityVariant(m.criticality)}>
                {m.criticality === "CRITICAL" ? "Critical" : "Non-Critical"}
              </Badge>
            )}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {m.status === "DRAFT" && (
            <Button onClick={() => runTransition("submit-for-approval", "Submitted for approval")} disabled={transition.isPending}>
              Submit for Approval
            </Button>
          )}
          {m.status === "PENDING_APPROVAL" && (
            <>
              <Button variant="outline" onClick={() => setReasonAction({ action: "reject", title: "Reject Material", default: "Does not meet requirements" })} disabled={transition.isPending}>Reject</Button>
              <Button onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {m.status === "APPROVED" && (
            <>
              <Button variant="outline" onClick={() => setReceiveOpen(true)}>Receive Material</Button>
              <Button variant="outline" onClick={() => setReasonAction({ action: "put-on-hold", title: "Put On Hold", default: "Temporary hold pending investigation" })} disabled={transition.isPending}>Put On Hold</Button>
              <Button variant="outline" onClick={() => setReasonAction({ action: "obsolete", title: "Obsolete Material", default: "Superseded by newer version" })} disabled={transition.isPending}>Obsolete</Button>
            </>
          )}
          {m.status === "ON_HOLD" && (
            <>
              <Button onClick={() => runTransition("release", "Released from hold")} disabled={transition.isPending}>Release</Button>
              <Button variant="outline" onClick={() => setReasonAction({ action: "obsolete", title: "Obsolete Material", default: "Superseded by newer version" })} disabled={transition.isPending}>Obsolete</Button>
            </>
          )}
        </div>
      </div>

      {/* Key info strip */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Meta label="Code" value={<span className="font-mono">{m.materialCode}</span>} />
        <Meta label="Unit" value={UOM_LABELS[m.unitOfMeasure] ?? m.unitOfMeasure} />
        <Meta label="Storage" value={m.standardStorageCondition ? (STORAGE_CONDITION_LABELS[m.standardStorageCondition as keyof typeof STORAGE_CONDITION_LABELS] ?? m.standardStorageCondition) : "—"} />
        <Meta label="Default Location" value={m.defaultStorageLocation ?? "—"} />
        <Meta label="Reorder Level" value={m.reorderLevel != null ? String(m.reorderLevel) : "—"} />
        <Meta label="Category" value={m.category ? (MATERIAL_CATEGORY_LABELS[m.category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? m.category) : "—"} />
      </div>

      {/* Warning banners */}
      {quarantinedLots.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-4 py-2 text-body text-[#8A6D00]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {quarantinedLots.length} lot(s) currently in quarantine / pending QA disposition.
        </div>
      )}
      {m.approvedSupplierRequired && suppliers.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-4 py-2 text-body text-[#8A6D00]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Approved supplier is required but none have been linked to this material.
        </div>
      )}

      {/* Tab bar */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 text-body font-medium transition-colors whitespace-nowrap",
                tab === t.key
                  ? "border-b-2 border-brand-primary text-brand-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}

      {/* Overview */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Lots", value: lots.length },
              { label: "Released", value: releasedLots.length, className: "text-success" },
              { label: "Quarantined", value: quarantinedLots.length, className: quarantinedLots.length > 0 ? "text-warning-foreground" : "" },
              { label: "Open Quality Issues", value: qualityLinks.length },
            ].map((card) => (
              <Card key={card.label}>
                <CardContent className="pt-4">
                  <p className="text-label text-muted-foreground">{card.label}</p>
                  <p className={cn("text-h2 font-bold", card.className)}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>QA Control Checklist</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {[
                    { label: "QC Testing Required", value: m.qcTestingRequired },
                    { label: "Sampling Required", value: m.samplingRequired },
                    { label: "COA Required", value: m.coaRequired },
                    { label: "SDS Required", value: m.sdsRequired },
                    { label: "Approved Supplier Required", value: m.approvedSupplierRequired },
                    { label: "Quarantine on Receipt", value: m.quarantineRequiredOnReceipt },
                    { label: "QA Release Required Before Use", value: m.qaReleaseRequiredBeforeUse },
                    { label: "Risk Assessment Required", value: m.riskAssessmentRequired },
                  ].map((item) => (
                    <li key={item.label} className="flex items-center justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                      <span className="text-body">{item.label}</span>
                      <YesNo value={item.value} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {m.description && (
                <Card>
                  <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                  <CardContent><p className="whitespace-pre-wrap text-body">{m.description}</p></CardContent>
                </Card>
              )}
              {m.intendedUse && (
                <Card>
                  <CardHeader><CardTitle>Intended Use</CardTitle></CardHeader>
                  <CardContent><p className="whitespace-pre-wrap text-body">{m.intendedUse}</p></CardContent>
                </Card>
              )}
              {lots.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Recent Lots</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {lots.slice(0, 3).map((lot) => (
                        <div key={lot.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                          <span className="font-mono text-body">{lot.internalLotNumber}</span>
                          <Badge variant={lotStatusVariant(lot.lotStatus)}>{LOT_STATUS_LABELS[lot.lotStatus as keyof typeof LOT_STATUS_LABELS] ?? lot.lotStatus}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Material Details */}
      {tab === "details" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Basic Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Material Code" value={<span className="font-mono">{m.materialCode}</span>} />
                <Field label="Material Type" value={MATERIAL_TYPE_LABELS[m.materialType] ?? m.materialType} />
                <Field label="Category" value={m.category ? (MATERIAL_CATEGORY_LABELS[m.category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? m.category) : "—"} />
                <Field label="Criticality" value={m.criticality === "CRITICAL" ? "Critical" : m.criticality === "NON_CRITICAL" ? "Non-Critical" : "—"} />
                <Field label="Grade" value={m.grade ?? "—"} />
                <Field label="CAS Number" value={m.casNumber ?? "—"} />
                <Field label="Unit of Measure" value={UOM_LABELS[m.unitOfMeasure] ?? m.unitOfMeasure} />
                <Field label="Storage Condition" value={m.standardStorageCondition ? (STORAGE_CONDITION_LABELS[m.standardStorageCondition as keyof typeof STORAGE_CONDITION_LABELS] ?? m.standardStorageCondition) : "—"} />
                <Field label="Specification Reference" value={m.specificationReference ?? "—"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>QA Controls</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="QC Testing" value={<YesNo value={m.qcTestingRequired} />} />
                <Field label="Sampling" value={<YesNo value={m.samplingRequired} />} />
                <Field label="COA Required" value={<YesNo value={m.coaRequired} />} />
                <Field label="SDS Required" value={<YesNo value={m.sdsRequired} />} />
                <Field label="Approved Supplier" value={<YesNo value={m.approvedSupplierRequired} />} />
                <Field label="Expiry Date" value={<YesNo value={m.expiryDateRequired} />} />
                <Field label="Retest Date" value={<YesNo value={m.retestDateRequired} />} />
                <Field label="Quarantine on Receipt" value={<YesNo value={m.quarantineRequiredOnReceipt} />} />
                <Field label="QA Release Before Use" value={<YesNo value={m.qaReleaseRequiredBeforeUse} />} />
                <Field label="Risk Assessment" value={<YesNo value={m.riskAssessmentRequired} />} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Stock Controls</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Min Stock Level" value={m.minimumStockLevel != null ? String(m.minimumStockLevel) : "—"} />
                <Field label="Max Stock Level" value={m.maximumStockLevel != null ? String(m.maximumStockLevel) : "—"} />
                <Field label="Reorder Level" value={m.reorderLevel != null ? String(m.reorderLevel) : "—"} />
                <Field label="Reorder Quantity" value={m.reorderQuantity != null ? String(m.reorderQuantity) : "—"} />
                <Field label="Default Warehouse" value={m.defaultWarehouse ?? "—"} />
                <Field label="Default Location" value={m.defaultStorageLocation ?? "—"} />
                <Field label="FEFO Required" value={<YesNo value={m.fefoRequired} />} />
                <Field label="FIFO Required" value={<YesNo value={m.fifoRequired} />} />
              </div>
            </CardContent>
          </Card>

          {m.specification && (
            <Card>
              <CardHeader><CardTitle>Specification</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-body">{m.specification}</p></CardContent>
            </Card>
          )}
          {m.intendedUse && (
            <Card>
              <CardHeader><CardTitle>Intended Use</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-body">{m.intendedUse}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Approved Suppliers */}
      {tab === "suppliers" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Approved Suppliers</CardTitle>
              <Button size="sm" onClick={() => setSupplierOpen(true)}><Plus className="mr-1 h-4 w-4" />Link Supplier</Button>
            </div>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <p className="text-body text-muted-foreground">No suppliers linked. Click &quot;Link Supplier&quot; to add approved suppliers.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label text-muted-foreground">
                      <th className="pb-2 pl-4 pr-4">Supplier ID</th>
                      <th className="pb-2 pr-4">Approved?</th>
                      <th className="pb-2 pr-4">Scope</th>
                      <th className="pb-2 pr-4">Effective Date</th>
                      <th className="pb-2 pr-4">Review Date</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pl-4 pr-4 font-mono">{s.supplierId}</td>
                        <td className="py-2 pr-4"><Badge variant={s.approvedForMaterial ? "success" : "neutral"}>{s.approvedForMaterial ? "Yes" : "No"}</Badge></td>
                        <td className="py-2 pr-4 max-w-xs truncate">{s.scopeOfApproval ?? "—"}</td>
                        <td className="py-2 pr-4">{s.effectiveDate ? formatDate(s.effectiveDate) : "—"}</td>
                        <td className="py-2 pr-4">{s.reviewDate ? formatDate(s.reviewDate) : "—"}</td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" onClick={() => removeSupplierMut.mutateAsync(s.id).then(() => toast.success("Removed"))}>
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lots / Batches */}
      {tab === "lots" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lots / Batches ({lots.length})</CardTitle>
              <Button size="sm" onClick={() => setReceiveOpen(true)}><Plus className="mr-1 h-4 w-4" />Receive Material</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { label: "All", count: lots.length },
                { label: "Released", count: releasedLots.length },
                { label: "Quarantined/Pending", count: quarantinedLots.length },
                { label: "Rejected", count: lots.filter((l) => l.lotStatus === "REJECTED").length },
              ].map((pill) => (
                <span key={pill.label} className="rounded-full border border-border px-3 py-0.5 text-label">
                  {pill.label}: <strong>{pill.count}</strong>
                </span>
              ))}
            </div>

            {lots.length === 0 ? (
              <p className="text-body text-muted-foreground">No lots received yet. Use &quot;Receive Material&quot; to record incoming batches.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label text-muted-foreground">
                      <th className="pb-2 pl-4 pr-4">Lot No.</th>
                      <th className="pb-2 pr-4">Supplier Lot</th>
                      <th className="pb-2 pr-4">Received Qty</th>
                      <th className="pb-2 pr-4">Remaining</th>
                      <th className="pb-2 pr-4">Received Date</th>
                      <th className="pb-2 pr-4">Expiry Date</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => (
                      <tr key={lot.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pl-4 pr-4 font-mono">{lot.internalLotNumber}</td>
                        <td className="py-2 pr-4">{lot.supplierLotNumber ?? "—"}</td>
                        <td className="py-2 pr-4">{lot.receivedQuantity} {lot.unitOfMeasure}</td>
                        <td className="py-2 pr-4">{lot.remainingQuantity ?? "—"}</td>
                        <td className="py-2 pr-4">{lot.dateReceived ? formatDate(lot.dateReceived) : "—"}</td>
                        <td className="py-2 pr-4">{lot.expiryDate ? formatDate(lot.expiryDate) : "—"}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={lotStatusVariant(lot.lotStatus)}>
                            {LOT_STATUS_LABELS[lot.lotStatus as keyof typeof LOT_STATUS_LABELS] ?? lot.lotStatus}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            {(lot.lotStatus === "QUARANTINED" || lot.lotStatus === "QA_REVIEW_PENDING" || lot.lotStatus === "UNDER_QC_TESTING") && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("release"); }}>Release</Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("reject"); }}>Reject</Button>
                                <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("hold"); }}>Hold</Button>
                              </>
                            )}
                            {lotIsUsable(lot.lotStatus) && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("issue"); }}>Issue</Button>
                            )}
                            {(lot.lotStatus === "ON_HOLD" || lot.lotStatus === "REJECTED" || lot.lotStatus === "EXPIRED") && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("dispose"); }}>Dispose</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receiving */}
      {tab === "receiving" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Receiving</CardTitle>
              <Button size="sm" onClick={() => setReceiveOpen(true)}><Plus className="mr-1 h-4 w-4" />Receive Material</Button>
            </div>
          </CardHeader>
          <CardContent>
            {lots.length === 0 ? (
              <p className="text-body text-muted-foreground">No materials received yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label text-muted-foreground">
                      <th className="pb-2 pl-4 pr-4">Lot No.</th>
                      <th className="pb-2 pr-4">Received Date</th>
                      <th className="pb-2 pr-4">Supplier Lot</th>
                      <th className="pb-2 pr-4">Qty Received</th>
                      <th className="pb-2 pr-4">Expiry Date</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.slice(0, 10).map((lot) => (
                      <tr key={lot.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pl-4 pr-4 font-mono">{lot.internalLotNumber}</td>
                        <td className="py-2 pr-4">{lot.dateReceived ? formatDate(lot.dateReceived) : "—"}</td>
                        <td className="py-2 pr-4">{lot.supplierLotNumber ?? "—"}</td>
                        <td className="py-2 pr-4">{lot.receivedQuantity} {lot.unitOfMeasure}</td>
                        <td className="py-2 pr-4">{lot.expiryDate ? formatDate(lot.expiryDate) : "—"}</td>
                        <td className="py-2"><Badge variant={lotStatusVariant(lot.lotStatus)}>{LOT_STATUS_LABELS[lot.lotStatus as keyof typeof LOT_STATUS_LABELS] ?? lot.lotStatus}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Release / Rejection */}
      {tab === "disposition" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Lots Requiring Disposition</CardTitle></CardHeader>
            <CardContent>
              {quarantinedLots.length === 0 ? (
                <p className="text-body text-muted-foreground">No lots currently pending QA disposition.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-border text-left text-label text-muted-foreground">
                        <th className="pb-2 pl-4 pr-4">Lot No.</th>
                        <th className="pb-2 pr-4">Received Qty</th>
                        <th className="pb-2 pr-4">Received Date</th>
                        <th className="pb-2 pr-4">Expiry</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarantinedLots.map((lot) => (
                        <tr key={lot.id} className="border-b border-border/50">
                          <td className="py-2 pl-4 pr-4 font-mono">{lot.internalLotNumber}</td>
                          <td className="py-2 pr-4">{lot.receivedQuantity} {lot.unitOfMeasure}</td>
                          <td className="py-2 pr-4">{lot.dateReceived ? formatDate(lot.dateReceived) : "—"}</td>
                          <td className="py-2 pr-4">{lot.expiryDate ? formatDate(lot.expiryDate) : "—"}</td>
                          <td className="py-2 pr-4"><Badge variant={lotStatusVariant(lot.lotStatus)}>{LOT_STATUS_LABELS[lot.lotStatus as keyof typeof LOT_STATUS_LABELS] ?? lot.lotStatus}</Badge></td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("release"); }}>Release</Button>
                              <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("reject"); }}>Reject</Button>
                              <Button size="sm" variant="outline" onClick={() => { setSelectedLot(lot); setLotAction("hold"); }}>Hold</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Processed Lots</CardTitle></CardHeader>
            <CardContent>
              {lots.filter((l) => l.lotStatus === "RELEASED" || l.lotStatus === "REJECTED" || l.lotStatus === "DISPOSED").length === 0 ? (
                <p className="text-body text-muted-foreground">No lots have been released or rejected yet.</p>
              ) : (
                <div className="space-y-2">
                  {lots.filter((l) => l.lotStatus === "RELEASED" || l.lotStatus === "REJECTED" || l.lotStatus === "DISPOSED").map((lot) => (
                    <div key={lot.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                      <span className="font-mono text-body">{lot.internalLotNumber}</span>
                      <div className="flex items-center gap-3 text-label text-muted-foreground">
                        {lot.lotStatus === "REJECTED" && lot.rejectionReason && <span>{lot.rejectionReason}</span>}
                        <Badge variant={lotStatusVariant(lot.lotStatus)}>{LOT_STATUS_LABELS[lot.lotStatus as keyof typeof LOT_STATUS_LABELS] ?? lot.lotStatus}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Ledger */}
      {tab === "ledger" && (
        <Card>
          <CardHeader><CardTitle>Inventory Ledger</CardTitle></CardHeader>
          <CardContent>
            {(ledgerQ.data ?? []).length === 0 ? (
              <p className="text-body text-muted-foreground">No inventory movements recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label text-muted-foreground">
                      <th className="pb-2 pl-4 pr-4">Date / Time</th>
                      <th className="pb-2 pr-4">Transaction Type</th>
                      <th className="pb-2 pr-4">Qty In</th>
                      <th className="pb-2 pr-4">Qty Out</th>
                      <th className="pb-2 pr-4">Balance</th>
                      <th className="pb-2 pr-4">UoM</th>
                      <th className="pb-2 pr-4">Reference</th>
                      <th className="pb-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledgerQ.data ?? []).map((entry) => (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pl-4 pr-4 whitespace-nowrap">{formatDate(entry.transactionAt)}</td>
                        <td className="py-2 pr-4">{entry.transactionType.replace(/_/g, " ")}</td>
                        <td className="py-2 pr-4 text-success">{entry.quantityIn != null ? `+${entry.quantityIn}` : "—"}</td>
                        <td className="py-2 pr-4 text-error">{entry.quantityOut != null ? `-${entry.quantityOut}` : "—"}</td>
                        <td className="py-2 pr-4 font-medium">{entry.balance ?? "—"}</td>
                        <td className="py-2 pr-4">{entry.unitOfMeasure ?? "—"}</td>
                        <td className="py-2 pr-4">{entry.referenceDocument ?? "—"}</td>
                        <td className="py-2 max-w-xs truncate">{entry.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quality Issues */}
      {tab === "quality" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Linked Quality Records</CardTitle>
              <Button size="sm" onClick={() => setQualityOpen(true)}><Plus className="mr-1 h-4 w-4" />Link Quality Record</Button>
            </div>
          </CardHeader>
          <CardContent>
            {qualityLinks.length === 0 ? (
              <p className="text-body text-muted-foreground">No quality records linked.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label text-muted-foreground">
                      <th className="pb-2 pl-4 pr-4">Record Type</th>
                      <th className="pb-2 pr-4">Reference</th>
                      <th className="pb-2 pr-4">Title</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Notes</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {qualityLinks.map((link) => (
                      <tr key={link.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pl-4 pr-4"><Badge variant="neutral">{link.recordType.replace(/_/g, " ")}</Badge></td>
                        <td className="py-2 pr-4 font-mono">{link.recordReference ?? link.recordId}</td>
                        <td className="py-2 pr-4 max-w-xs truncate">{link.recordTitle ?? "—"}</td>
                        <td className="py-2 pr-4">{link.recordStatus ?? "—"}</td>
                        <td className="py-2 pr-4 max-w-xs truncate">{link.notes ?? "—"}</td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" onClick={() => removeQualityMut.mutateAsync(link.id).then(() => toast.success("Removed"))}>
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {tab === "trail" && (
        <Card>
          <CardContent className="pt-4">
            <AuditTrailTable entries={auditQ.data} isLoading={auditQ.isLoading} isError={auditQ.isError} />
          </CardContent>
        </Card>
      )}

      {/* ── Modals ── */}

      {/* Approve */}
      <SignatureModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Material"
        recordNumber={m.materialCode}
        recordTitle={m.name}
        recordNoun="material"
        statusNode={<Badge variant={materialStatusVariant(m.status)}>{MATERIAL_STATUS_LABELS[m.status] ?? m.status}</Badge>}
        isPending={approve.isPending}
        successMessage="Material approved"
        onSign={async (creds) => {
          await approve.mutateAsync({ id, expectedVersion: m.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
        }}
      />

      {/* Workflow reason modal */}
      <ReasonModal
        open={!!reasonAction && !lotAction}
        onOpenChange={(open) => !open && setReasonAction(null)}
        title={reasonAction?.title ?? "Confirm Action"}
        defaultReason={reasonAction?.default ?? ""}
        submitLabel="Confirm"
        isPending={transition.isPending}
        onSubmit={async (reason) => {
          if (!reasonAction) return;
          await runTransition(reasonAction.action, reason);
          setReasonAction(null);
        }}
      />

      {/* Lot reason modal (release/reject/hold/dispose) */}
      <ReasonModal
        open={!!selectedLot && !!needsLotReasonModal}
        onOpenChange={(open) => { if (!open) { setSelectedLot(null); setLotAction(null); } }}
        title={lotAction === "release" ? "Release Lot" : lotAction === "reject" ? "Reject Lot" : lotAction === "hold" ? "Hold Lot" : "Dispose Lot"}
        defaultReason={lotAction === "release" ? "QC testing passed — released for use" : ""}
        submitLabel={lotAction === "release" ? "Release" : lotAction === "reject" ? "Reject" : lotAction === "hold" ? "Hold" : "Dispose"}
        isPending={releaseLotMut.isPending || rejectLotMut.isPending || holdLotMut.isPending || disposeLotMut.isPending}
        onSubmit={runLotAction}
      />

      {/* Issue material modal */}
      <ActionFormModal
        open={!!selectedLot && lotAction === "issue"}
        onOpenChange={(open) => { if (!open) { setSelectedLot(null); setLotAction(null); } }}
        title="Issue Material"
        description={selectedLot ? `Lot: ${selectedLot.internalLotNumber} — Remaining: ${selectedLot.remainingQuantity ?? "?"} ${selectedLot.unitOfMeasure}` : ""}
        submitLabel="Issue"
        isPending={issueMut.isPending}
        fields={[
          { name: "quantityIssued", label: "Quantity to Issue *", type: "number", required: true },
          { name: "issuedTo", label: "Issued To", type: "select", options: [
            { value: "PRODUCTION", label: "Production" },
            { value: "LABORATORY", label: "Laboratory" },
            { value: "WAREHOUSE", label: "Warehouse" },
            { value: "MAINTENANCE", label: "Maintenance" },
            { value: "OTHER_DEPARTMENT", label: "Other Department" },
          ]},
          { name: "department", label: "Department / Area" },
          { name: "batchWorkOrderRef", label: "Batch / Work Order Reference" },
          { name: "issueDate", label: "Issue Date *", type: "date", required: true },
          { name: "purposeOfUse", label: "Purpose of Use", type: "textarea" },
        ] satisfies FieldDef[]}
        onSubmit={async (vals) => {
          if (!selectedLot) return;
          await issueMut.mutateAsync({
            lotId: selectedLot.id,
            quantityIssued: parseFloat(vals.quantityIssued),
            issuedTo: vals.issuedTo || undefined,
            department: vals.department || undefined,
            batchWorkOrderRef: vals.batchWorkOrderRef || undefined,
            issueDate: vals.issueDate as never,
            purposeOfUse: vals.purposeOfUse || undefined,
          });
          toast.success("Material issued");
          setSelectedLot(null);
          setLotAction(null);
        }}
      />

      {/* Receive material modal */}
      <ActionFormModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title="Receive Material"
        submitLabel="Receive"
        isPending={receiveMut.isPending}
        fields={[
          { name: "supplierId", label: "Supplier ID *", type: "number", required: true },
          { name: "supplierLotNumber", label: "Supplier Lot Number" },
          { name: "purchaseOrderNumber", label: "Purchase Order Number" },
          { name: "deliveryNoteNumber", label: "Delivery Note Number" },
          { name: "invoiceNumber", label: "Invoice Number" },
          { name: "dateReceived", label: "Date Received *", type: "date", required: true },
          { name: "quantityReceived", label: "Quantity Received *", type: "number", required: true },
          { name: "unitOfMeasure", label: "Unit of Measure", defaultValue: m.unitOfMeasure },
          { name: "containerCondition", label: "Container Condition", type: "select", options: [
            { value: "ACCEPTABLE", label: "Acceptable" },
            { value: "DAMAGED", label: "Damaged" },
            { value: "LEAKING", label: "Leaking" },
            { value: "MISSING_LABEL", label: "Missing Label" },
            { value: "OTHER", label: "Other" },
          ]},
          { name: "transportCondition", label: "Transport Condition", type: "select", options: [
            { value: "ACCEPTABLE", label: "Acceptable" },
            { value: "TEMPERATURE_EXCURSION", label: "Temperature Excursion" },
            { value: "DAMAGED", label: "Damaged" },
            { value: "DELAYED", label: "Delayed" },
            { value: "OTHER", label: "Other" },
          ]},
          { name: "storageLocation", label: "Storage Location", defaultValue: m.defaultStorageLocation ?? "" },
          { name: "expiryDate", label: "Expiry Date", type: "date" },
          { name: "receiptNotes", label: "Receipt Notes", type: "textarea" },
        ] satisfies FieldDef[]}
        onSubmit={async (vals) => {
          await receiveMut.mutateAsync({
            supplierId: parseInt(vals.supplierId),
            supplierLotNumber: vals.supplierLotNumber || undefined,
            purchaseOrderNumber: vals.purchaseOrderNumber || undefined,
            deliveryNoteNumber: vals.deliveryNoteNumber || undefined,
            invoiceNumber: vals.invoiceNumber || undefined,
            dateReceived: vals.dateReceived as never,
            quantityReceived: parseFloat(vals.quantityReceived),
            unitOfMeasure: vals.unitOfMeasure || m.unitOfMeasure,
            containerCondition: vals.containerCondition || undefined,
            transportCondition: vals.transportCondition || undefined,
            storageLocation: vals.storageLocation || undefined,
            expiryDate: vals.expiryDate ? vals.expiryDate as never : undefined,
            receiptNotes: vals.receiptNotes || undefined,
          });
          toast.success("Material received — lot created");
        }}
      />

      {/* Link supplier modal */}
      <ActionFormModal
        open={supplierOpen}
        onOpenChange={setSupplierOpen}
        title="Link Supplier"
        submitLabel="Link"
        isPending={addSupplierMut.isPending}
        fields={[
          { name: "supplierId", label: "Supplier ID *", type: "number", required: true },
          { name: "approvedForMaterial", label: "Approved for Material?", type: "select", options: [
            { value: "true", label: "Yes — Approved" },
            { value: "false", label: "No — Informational Link" },
          ]},
          { name: "scopeOfApproval", label: "Scope of Approval", type: "textarea" },
          { name: "effectiveDate", label: "Effective Date", type: "date" },
          { name: "reviewDate", label: "Review Date", type: "date" },
        ] satisfies FieldDef[]}
        onSubmit={async (vals) => {
          await addSupplierMut.mutateAsync({
            supplierId: parseInt(vals.supplierId),
            approvedForMaterial: vals.approvedForMaterial === "true",
            scopeOfApproval: vals.scopeOfApproval || undefined,
            effectiveDate: vals.effectiveDate || undefined,
            reviewDate: vals.reviewDate || undefined,
          });
          toast.success("Supplier linked");
        }}
      />

      {/* Link quality record modal */}
      <ActionFormModal
        open={qualityOpen}
        onOpenChange={setQualityOpen}
        title="Link Quality Record"
        submitLabel="Link"
        isPending={addQualityMut.isPending}
        fields={[
          { name: "recordType", label: "Record Type *", type: "select", required: true, options: [
            { value: "OOS_OOT", label: "OOS / OOT" },
            { value: "DEVIATION", label: "Deviation" },
            { value: "CAPA", label: "CAPA" },
            { value: "NCR", label: "Non-Conformance (NCR)" },
            { value: "AUDIT_FINDING", label: "Audit Finding" },
            { value: "CHANGE_CONTROL", label: "Change Control" },
            { value: "RISK", label: "Risk" },
            { value: "RECALL", label: "Recall" },
            { value: "CUSTOMER_COMPLAINT", label: "Customer Complaint" },
          ]},
          { name: "recordId", label: "Record ID *", required: true },
          { name: "recordReference", label: "Reference Number" },
          { name: "recordTitle", label: "Title / Summary" },
          { name: "notes", label: "Notes", type: "textarea" },
        ] satisfies FieldDef[]}
        onSubmit={async (vals) => {
          await addQualityMut.mutateAsync({
            recordType: vals.recordType,
            recordId: vals.recordId,
            recordReference: vals.recordReference || undefined,
            recordTitle: vals.recordTitle || undefined,
            notes: vals.notes || undefined,
          });
          toast.success("Quality record linked");
        }}
      />
    </div>
  );
}

export default function MaterialDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading material…" />}>
      <MaterialDetailContent />
    </Suspense>
  );
}
