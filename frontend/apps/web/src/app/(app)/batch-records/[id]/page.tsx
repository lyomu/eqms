"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  useBatch,
  useBatchTraceability,
  useBatchDeviations,
  useBatchAudit,
  useBatchTransition,
  useReleaseBatch,
  useRecordStep,
  useLinkMaterial,
  useLinkQcTest,
  useAddProduct,
  useRecordBatchDeviation,
  type BatchAction,
} from "@/hooks/useBatch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { BatchStatusBadge } from "@/components/batch/BatchStatusBadge";
import { SignatureModal } from "@/components/common/SignatureModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate, formatDateTime } from "@/lib/format";
import { QC_STATUS_VARIANT, type QcTestStatus } from "@/types/batch";

type TabKey = "steps" | "materials" | "qc" | "products" | "deviations" | "audit";

export default function BatchDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const batch = useBatch(id);
  const trace = useBatchTraceability(id);
  const deviations = useBatchDeviations(id);
  const audit = useBatchAudit(id);
  const transition = useBatchTransition();
  const release = useReleaseBatch();

  const [tab, setTab] = useState<TabKey>("steps");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [modal, setModal] = useState<null | "step" | "material" | "qc" | "product" | "deviation">(null);

  if (batch.isLoading) return <LoadingScreen label="Loading batch record…" />;
  if (batch.isError || !batch.data) return <ErrorAlert title="Error" message="Failed to load this batch record." />;
  const b = batch.data;
  const editable = b.status === "IN_PROGRESS";

  async function runAction(action: BatchAction, reason: string) {
    try {
      await transition.mutateAsync({ id, action, expectedVersion: b.version, reason });
      toast.success("Done");
    } catch { /* interceptor */ }
  }
  function promptAction(action: BatchAction, message: string, fallback: string) {
    const reason = window.prompt(message);
    if (reason === null) return;
    runAction(action, reason || fallback);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/batch-records" className="hover:underline">Batch Records</Link>
            <span>/</span><span>{b.batchNo}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{b.batchNo}</h1>
          <div className="mt-1 flex items-center gap-2">
            <BatchStatusBadge status={b.status} />
            <span className="text-label text-muted-foreground">{b.productCode} · {b.batchSize} {b.unit}</span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {editable && (
            <Button onClick={() => runAction("qa-review", "Submitted for QA review")} disabled={transition.isPending}>Submit to QA</Button>
          )}
          {b.status === "QA_REVIEW" && (
            <>
              <Button variant="outline" onClick={() => promptAction("reject", "Reason for rejection:", "Rejected")} disabled={transition.isPending}>Reject</Button>
              <Button variant="outline" onClick={() => promptAction("quarantine", "Reason for quarantine:", "Quarantined")} disabled={transition.isPending}>Quarantine</Button>
              <Button onClick={() => setReleaseOpen(true)}>Release</Button>
            </>
          )}
          {b.status === "RELEASED" && (
            <>
              <Button variant="outline" onClick={() => promptAction("quarantine", "Reason for quarantine:", "Quarantined")} disabled={transition.isPending}>Quarantine</Button>
              <Button variant="outline" onClick={() => promptAction("recall", "Reason for recall:", "Recalled")} disabled={transition.isPending}>Recall</Button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-body sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Product" value={b.productCode} />
          <Meta label="Batch Size" value={`${b.batchSize} ${b.unit}`} />
          <Meta label="Mfg Start" value={formatDate(b.manufacturingStartDate)} />
          <Meta label="Mfg End" value={formatDate(b.manufacturingEndDate)} />
          <Meta label="Released" value={formatDate(b.releasedAt)} />
          <Meta label="Status" value={<BatchStatusBadge status={b.status} />} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
            tabs={[
              { key: "steps", label: "Production Steps", count: b.productionSteps.length },
              { key: "materials", label: "Materials", count: trace.data?.materialsUsed.length },
              { key: "qc", label: "QC Results", count: b.qcResults.length },
              { key: "products", label: "Products", count: trace.data?.productsProduced.length },
              { key: "deviations", label: "Deviations", count: deviations.data?.length },
              { key: "audit", label: "Audit Trail" },
            ]}
          />
          {editable && (
            <div className="ml-auto flex flex-wrap gap-2 py-1">
              {tab === "steps" && <AddBtn onClick={() => setModal("step")} label="Record Step" />}
              {tab === "materials" && <AddBtn onClick={() => setModal("material")} label="Link Material" />}
              {tab === "qc" && <AddBtn onClick={() => setModal("qc")} label="Link QC Test" />}
              {tab === "products" && <AddBtn onClick={() => setModal("product")} label="Add Product" />}
              {tab === "deviations" && <AddBtn onClick={() => setModal("deviation")} label="Record Deviation" />}
            </div>
          )}
        </div>
        <CardContent className="pt-4">
          {tab === "steps" && <StepsTab steps={b.productionSteps} />}
          {tab === "materials" && <MaterialsTab trace={trace.data} loading={trace.isLoading} />}
          {tab === "qc" && <QcTab results={b.qcResults} />}
          {tab === "products" && <ProductsTab trace={trace.data} loading={trace.isLoading} />}
          {tab === "deviations" && <DeviationsTab ids={deviations.data} loading={deviations.isLoading} />}
          {tab === "audit" && <AuditTrailTable entries={audit.data} isLoading={audit.isLoading} isError={audit.isError} />}
        </CardContent>
      </Card>

      {/* Release ceremony */}
      <SignatureModal
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        title="Release Batch"
        recordNumber={b.batchNo}
        recordTitle={`${b.productCode} · ${b.batchSize} ${b.unit}`}
        recordNoun="batch"
        statusNode={<BatchStatusBadge status={b.status} />}
        isPending={release.isPending}
        successMessage="Batch released"
        onSign={async (creds) => {
          await release.mutateAsync({ id, expectedVersion: b.version, password: creds.password, totpCode: creds.totpCode, reason: creds.reason, meaningStatement: creds.meaningStatement });
        }}
      />

      {/* Child-record modals */}
      <RecordStepModal id={id} open={modal === "step"} onClose={() => setModal(null)} nextStep={b.productionSteps.length + 1} />
      <LinkMaterialModal id={id} open={modal === "material"} onClose={() => setModal(null)} />
      <LinkQcModal id={id} open={modal === "qc"} onClose={() => setModal(null)} />
      <AddProductModal id={id} open={modal === "product"} onClose={() => setModal(null)} />
      <RecordDeviationModal id={id} open={modal === "deviation"} onClose={() => setModal(null)} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Plus className="h-4 w-4" /> {label}
    </Button>
  );
}

/* ----------------------------- tabs ----------------------------- */

function StepsTab({ steps }: { steps: import("@/types/batch").BatchProductionStep[] }) {
  if (steps.length === 0) return <Empty text="No production steps recorded." />;
  return (
    <ol className="space-y-3">
      {[...steps].sort((a, b) => a.stepNumber - b.stepNumber).map((s) => (
        <li key={s.id} className="rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-label font-medium text-brand-primary">{s.stepNumber}</span>
            <span className="font-medium">{s.stepDescription}</span>
            {s.anomaliesNoted && <Badge variant="warning" className="ml-auto">Anomaly</Badge>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-label text-muted-foreground sm:grid-cols-4">
            <span>Equipment: {s.equipmentUsed || "—"}</span>
            <span>Start: {formatDateTime(s.startTime)}</span>
            <span>End: {formatDateTime(s.endTime)}</span>
            <span>Params: {s.parametersRecorded || "—"}</span>
          </div>
          {s.anomaliesNoted && <p className="mt-1 text-label text-error">Anomaly: {s.anomaliesNoted}</p>}
        </li>
      ))}
    </ol>
  );
}

function MaterialsTab({ trace, loading }: { trace?: import("@/types/batch").BatchTraceability; loading: boolean }) {
  if (loading) return <Empty text="Loading…" />;
  const items = trace?.materialsUsed ?? [];
  if (items.length === 0) return <Empty text="No materials linked." />;
  return (
    <table className="w-full text-body">
      <thead><tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
        <th className="py-2 pr-4">Material</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Supplier</th><th className="py-2">Qty</th>
      </tr></thead>
      <tbody>
        {items.map((m) => (
          <tr key={m.id} className="border-b border-border last:border-0">
            <td className="py-2 pr-4 font-medium">{m.materialCode}</td>
            <td className="py-2 pr-4">{m.lotNumber}</td>
            <td className="py-2 pr-4">{m.supplier || "—"}</td>
            <td className="py-2">{m.quantityUsed} {m.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QcTab({ results }: { results: import("@/types/batch").QcResult[] }) {
  if (results.length === 0) return <Empty text="No QC results linked." />;
  return (
    <table className="w-full text-body">
      <thead><tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
        <th className="py-2 pr-4">Test</th><th className="py-2 pr-4">Spec</th><th className="py-2 pr-4">Result</th><th className="py-2 pr-4">Status</th><th className="py-2">Date</th>
      </tr></thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0">
            <td className="py-2 pr-4 font-medium">{r.testMethod}</td>
            <td className="py-2 pr-4">{r.specificationLimit}</td>
            <td className="py-2 pr-4">{r.actualResult}</td>
            <td className="py-2 pr-4"><Badge variant={QC_STATUS_VARIANT[r.testStatus]}>{r.testStatus}</Badge></td>
            <td className="py-2">{formatDate(r.testDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductsTab({ trace, loading }: { trace?: import("@/types/batch").BatchTraceability; loading: boolean }) {
  if (loading) return <Empty text="Loading…" />;
  const items = trace?.productsProduced ?? [];
  if (items.length === 0) return <Empty text="No products recorded." />;
  return (
    <table className="w-full text-body">
      <thead><tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
        <th className="py-2 pr-4">Product</th><th className="py-2 pr-4">Lot Assigned</th><th className="py-2">Qty</th>
      </tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id} className="border-b border-border last:border-0">
            <td className="py-2 pr-4 font-medium">{p.productCode}</td>
            <td className="py-2 pr-4">{p.lotNumberAssigned}</td>
            <td className="py-2">{p.quantity} {p.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DeviationsTab({ ids, loading }: { ids?: number[]; loading: boolean }) {
  if (loading) return <Empty text="Loading…" />;
  if (!ids || ids.length === 0) return <Empty text="No deviations recorded during manufacturing." />;
  return (
    <ul className="space-y-1">
      {ids.map((d) => (
        <li key={d}>
          <Link href={`/deviations/${d}`} className="text-brand-secondary hover:underline">Deviation #{d}</Link>
        </li>
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-body text-muted-foreground">{text}</p>;
}

/* ----------------------------- modals ----------------------------- */

function RecordStepModal({ id, open, onClose, nextStep }: { id: number; open: boolean; onClose: () => void; nextStep: number }) {
  const record = useRecordStep(id);
  const [stepNumber, setStepNumber] = useState(String(nextStep));
  const [stepDescription, setDesc] = useState("");
  const [equipmentUsed, setEquip] = useState("");
  const [startTime, setStart] = useState("");
  const [endTime, setEnd] = useState("");
  const [parametersRecorded, setParams] = useState("");
  const [anomaliesNoted, setAnomalies] = useState("");

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Record Production Step" description="Recorded contemporaneously; cannot be edited once saved.">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="st-num">Step #</Label><Input id="st-num" inputMode="numeric" value={stepNumber} onChange={(e) => setStepNumber(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="st-equip">Equipment</Label><Input id="st-equip" value={equipmentUsed} onChange={(e) => setEquip(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="st-desc">Description</Label><Input id="st-desc" value={stepDescription} onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="st-start">Start</Label><Input id="st-start" type="datetime-local" value={startTime} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="st-end">End</Label><Input id="st-end" type="datetime-local" value={endTime} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="st-params">Parameters</Label><Textarea id="st-params" rows={2} value={parametersRecorded} onChange={(e) => setParams(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="st-anom">Anomalies (optional)</Label><Textarea id="st-anom" rows={2} value={anomaliesNoted} onChange={(e) => setAnomalies(e.target.value)} /></div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={record.isPending}>Cancel</Button>
        <Button
          disabled={record.isPending || !stepDescription.trim() || !startTime}
          onClick={async () => {
            try {
              await record.mutateAsync({
                stepNumber: Number(stepNumber), stepDescription,
                equipmentUsed: equipmentUsed || null, startTime: new Date(startTime).toISOString(),
                endTime: endTime ? new Date(endTime).toISOString() : null,
                parametersRecorded: parametersRecorded || null, anomaliesNoted: anomaliesNoted || null,
              });
              toast.success("Step recorded"); onClose();
            } catch { /* interceptor */ }
          }}
        >{record.isPending ? "Saving…" : "Record"}</Button>
      </ModalFooter>
    </Modal>
  );
}

function LinkMaterialModal({ id, open, onClose }: { id: number; open: boolean; onClose: () => void }) {
  const link = useLinkMaterial(id);
  const [materialCode, setCode] = useState("");
  const [lotNumber, setLot] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantityUsed, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Link Material" description="Record a material lot consumed in this batch.">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Material code</Label><Input value={materialCode} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Lot number</Label><Input value={lotNumber} onChange={(e) => setLot(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Supplier</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Quantity used</Label><Input inputMode="decimal" value={quantityUsed} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        </div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={link.isPending}>Cancel</Button>
        <Button
          disabled={link.isPending || !materialCode.trim() || !lotNumber.trim() || !(Number(quantityUsed) > 0)}
          onClick={async () => {
            try {
              await link.mutateAsync({ materialCode, lotNumber, supplier: supplier || null, quantityUsed: Number(quantityUsed), unit });
              toast.success("Material linked"); onClose();
            } catch { /* interceptor */ }
          }}
        >{link.isPending ? "Saving…" : "Link"}</Button>
      </ModalFooter>
    </Modal>
  );
}

function LinkQcModal({ id, open, onClose }: { id: number; open: boolean; onClose: () => void }) {
  const link = useLinkQcTest(id);
  const [testMethod, setMethod] = useState("");
  const [specificationLimit, setSpec] = useState("");
  const [actualResult, setResult] = useState("");
  const [testDate, setDate] = useState("");
  const [testStatus, setStatus] = useState<QcTestStatus>("PASS");
  const [testLab, setLab] = useState("");
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Link QC Test" description="Attach a laboratory test result to this batch.">
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Test method</Label><Input value={testMethod} onChange={(e) => setMethod(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Specification limit</Label><Input value={specificationLimit} onChange={(e) => setSpec(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Actual result</Label><Input value={actualResult} onChange={(e) => setResult(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Test date</Label><Input type="date" value={testDate} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={testStatus} onChange={(e) => setStatus(e.target.value as QcTestStatus)}>
              <option value="PASS">Pass</option><option value="FAIL">Fail</option><option value="OOS">OOS</option>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Lab</Label><Input value={testLab} onChange={(e) => setLab(e.target.value)} /></div>
        </div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={link.isPending}>Cancel</Button>
        <Button
          disabled={link.isPending || !testMethod.trim() || !specificationLimit.trim() || !actualResult.trim() || !testDate}
          onClick={async () => {
            try {
              await link.mutateAsync({ testMethod, specificationLimit, actualResult, testDate: new Date(testDate).toISOString(), testStatus, testLab: testLab || null });
              toast.success("QC test linked"); onClose();
            } catch { /* interceptor */ }
          }}
        >{link.isPending ? "Saving…" : "Link"}</Button>
      </ModalFooter>
    </Modal>
  );
}

function AddProductModal({ id, open, onClose }: { id: number; open: boolean; onClose: () => void }) {
  const add = useAddProduct(id);
  const [productCode, setCode] = useState("");
  const [lotNumberAssigned, setLot] = useState("");
  const [quantity, setQty] = useState("");
  const [unit, setUnit] = useState("units");
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Add Product Produced" description="Record finished product output from this batch.">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Product code</Label><Input value={productCode} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Lot assigned</Label><Input value={lotNumberAssigned} onChange={(e) => setLot(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Quantity</Label><Input inputMode="decimal" value={quantity} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
        </div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={add.isPending}>Cancel</Button>
        <Button
          disabled={add.isPending || !productCode.trim() || !lotNumberAssigned.trim() || !(Number(quantity) > 0)}
          onClick={async () => {
            try {
              await add.mutateAsync({ productCode, lotNumberAssigned, quantity: Number(quantity), unit });
              toast.success("Product added"); onClose();
            } catch { /* interceptor */ }
          }}
        >{add.isPending ? "Saving…" : "Add"}</Button>
      </ModalFooter>
    </Modal>
  );
}

function RecordDeviationModal({ id, open, onClose }: { id: number; open: boolean; onClose: () => void }) {
  const record = useRecordBatchDeviation(id);
  const [deviationId, setDevId] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Record Deviation" description="Link an existing deviation that occurred during manufacturing.">
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Deviation ID</Label><Input inputMode="numeric" value={deviationId} onChange={(e) => setDevId(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Reason (optional)</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      </div>
      <ModalFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={record.isPending}>Cancel</Button>
        <Button
          disabled={record.isPending || !(Number(deviationId) > 0)}
          onClick={async () => {
            try {
              await record.mutateAsync({ deviationId: Number(deviationId), reason: reason || undefined });
              toast.success("Deviation linked"); onClose();
            } catch { /* interceptor */ }
          }}
        >{record.isPending ? "Saving…" : "Link"}</Button>
      </ModalFooter>
    </Modal>
  );
}
