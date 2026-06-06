"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useEquipment, useEquipmentTrail, useEquipmentAction } from "@/hooks/useEquipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { formatDate } from "@/lib/format";
import { equipmentTypeLabel } from "@/types/equipment";

type TabKey = "calibration" | "maintenance" | "specs" | "audit";
type FormModal = null | "perform" | "schedule" | "maintenance" | "spec";

export default function EquipmentDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const eq = useEquipment(id);
  const trail = useEquipmentTrail(id);
  const action = useEquipmentAction(id);
  const [tab, setTab] = useState<TabKey>("calibration");
  const [modal, setModal] = useState<FormModal>(null);

  if (eq.isLoading) return <LoadingScreen label="Loading equipment…" />;
  if (eq.isError || !eq.data) return <ErrorAlert title="Error" message="Failed to load this equipment." />;
  const e = eq.data;
  const active = e.status !== "RETIRED";

  function retire() {
    const reason = window.prompt("Reason for retiring this equipment:");
    if (reason === null) return;
    action.mutate({ path: "retire", body: { expectedVersion: e.version, reason: reason || "Retired" } }, { onSuccess: () => toast.success("Done") });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/equipment" className="hover:underline">Equipment</Link><span>/</span><span>{e.equipmentCode}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{e.equipmentName}</h1>
          <div className="mt-1 flex items-center gap-2">
            <EquipmentStatusBadge status={e.status} />
            <Badge variant="neutral">{equipmentTypeLabel(e.equipmentType)}</Badge>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {active && (
            <>
              <Button onClick={() => setModal("perform")} disabled={action.isPending}>Perform Calibration</Button>
              <Button variant="outline" onClick={() => setModal("schedule")} disabled={action.isPending}>Schedule</Button>
              <Button variant="outline" onClick={() => setModal("maintenance")} disabled={action.isPending}>Maintenance</Button>
              <Button variant="ghost" onClick={retire} disabled={action.isPending}>Retire</Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-body sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Manufacturer" value={e.manufacturer || "—"} />
          <Meta label="Model" value={e.model || "—"} />
          <Meta label="Serial" value={e.serialNumber || "—"} />
          <Meta label="Location" value={e.location || "—"} />
          <Meta label="Last Cal." value={formatDate(e.lastCalibrationDate)} />
          <Meta label="Next Cal." value={formatDate(e.nextCalibrationDate)} />
        </CardContent>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
          <Tabs active={tab} onChange={(k) => setTab(k as TabKey)} tabs={[
            { key: "calibration", label: "Calibration", count: e.calibrationHistory.length },
            { key: "maintenance", label: "Maintenance", count: e.maintenanceHistory.length },
            { key: "specs", label: "Specifications", count: e.specifications.length },
            { key: "audit", label: "Audit Trail" },
          ]} />
          {active && (
            <div className="ml-auto py-1">
              {tab === "specs" && <Button size="sm" variant="outline" onClick={() => setModal("spec")}><Plus className="h-4 w-4" /> Add Spec</Button>}
              {tab === "maintenance" && <Button size="sm" variant="outline" onClick={() => setModal("maintenance")}><Plus className="h-4 w-4" /> Record</Button>}
            </div>
          )}
        </div>
        <CardContent className="pt-4">
          {tab === "calibration" && (
            e.calibrationHistory.length === 0 ? <Empty text="No calibrations recorded." /> : (
              <table className="w-full text-body">
                <thead><tr className="border-b border-border text-left text-label uppercase text-muted-foreground"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Result</th><th className="py-2 pr-4">By</th><th className="py-2 pr-4">Next Due</th><th className="py-2">Notes</th></tr></thead>
                <tbody>
                  {e.calibrationHistory.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">{formatDate(c.calibrationDate)}</td>
                      <td className="py-2 pr-4"><Badge variant={c.results === "PASS" ? "success" : "error"}>{c.results}</Badge></td>
                      <td className="py-2 pr-4">{c.performedByName || "—"}</td>
                      <td className="py-2 pr-4">{formatDate(c.nextCalibrationDate)}</td>
                      <td className="py-2">{c.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === "maintenance" && (
            e.maintenanceHistory.length === 0 ? <Empty text="No maintenance recorded." /> : (
              <table className="w-full text-body">
                <thead><tr className="border-b border-border text-left text-label uppercase text-muted-foreground"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Work</th><th className="py-2">Downtime (h)</th></tr></thead>
                <tbody>
                  {e.maintenanceHistory.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">{formatDate(m.maintenanceDate)}</td>
                      <td className="py-2 pr-4"><Badge variant="neutral">{m.maintenanceType}</Badge></td>
                      <td className="py-2 pr-4">{m.workDescription}</td>
                      <td className="py-2">{m.downtimeHours ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === "specs" && (
            e.specifications.length === 0 ? <Empty text="No specifications defined." /> : (
              <table className="w-full text-body">
                <thead><tr className="border-b border-border text-left text-label uppercase text-muted-foreground"><th className="py-2 pr-4">Key</th><th className="py-2 pr-4">Value</th><th className="py-2 pr-4">Unit</th><th className="py-2">Acceptance Range</th></tr></thead>
                <tbody>
                  {e.specifications.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium">{s.specificationKey}</td>
                      <td className="py-2 pr-4">{s.specificationValue || "—"}</td>
                      <td className="py-2 pr-4">{s.unit || "—"}</td>
                      <td className="py-2">{s.acceptanceRangeMin ?? "—"} – {s.acceptanceRangeMax ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === "audit" && <AuditTrailTable entries={trail.data} isLoading={trail.isLoading} isError={trail.isError} />}
        </CardContent>
      </Card>

      <ActionFormModal open={modal === "perform"} onOpenChange={(o) => !o && setModal(null)} title="Perform Calibration" isPending={action.isPending} successMessage="Calibration recorded"
        fields={[
          { name: "calibrationDate", label: "Calibration date", type: "date", required: true },
          { name: "result", label: "Result", type: "select", options: [{ value: "PASS", label: "Pass" }, { value: "FAIL", label: "Fail" }] },
          { name: "performedByName", label: "Performed by", type: "text" },
          { name: "calibrationDueDate", label: "Next due date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "perform-calibration", body: { expectedVersion: e.version, calibrationDate: v.calibrationDate, result: v.result, performedByName: v.performedByName || undefined, calibrationDueDate: v.calibrationDueDate || undefined, notes: v.notes || undefined } }); }} />

      <ActionFormModal open={modal === "schedule"} onOpenChange={(o) => !o && setModal(null)} title="Schedule Calibration" isPending={action.isPending} successMessage="Calibration scheduled"
        fields={[{ name: "nextCalibrationDate", label: "Next calibration date", type: "date", required: true }]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "schedule-calibration", body: { expectedVersion: e.version, nextCalibrationDate: v.nextCalibrationDate } }); }} />

      <ActionFormModal open={modal === "maintenance"} onOpenChange={(o) => !o && setModal(null)} title="Record Maintenance" isPending={action.isPending} successMessage="Maintenance recorded"
        fields={[
          { name: "maintenanceDate", label: "Date", type: "date", required: true },
          { name: "maintenanceType", label: "Type", type: "select", options: [{ value: "PREVENTIVE", label: "Preventive" }, { value: "CORRECTIVE", label: "Corrective" }] },
          { name: "workDescription", label: "Work description", type: "textarea", required: true },
          { name: "performedByName", label: "Performed by", type: "text" },
          { name: "downtimeHours", label: "Downtime (hours)", type: "number" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "maintenance", body: { maintenanceDate: v.maintenanceDate, maintenanceType: v.maintenanceType, workDescription: v.workDescription, performedByName: v.performedByName || undefined, downtimeHours: v.downtimeHours ? Number(v.downtimeHours) : undefined } }); }} />

      <ActionFormModal open={modal === "spec"} onOpenChange={(o) => !o && setModal(null)} title="Add Specification" isPending={action.isPending} successMessage="Specification added"
        fields={[
          { name: "specificationKey", label: "Key", type: "text", required: true },
          { name: "specificationValue", label: "Value", type: "text" },
          { name: "unit", label: "Unit", type: "text" },
          { name: "acceptanceRangeMin", label: "Acceptance min", type: "number" },
          { name: "acceptanceRangeMax", label: "Acceptance max", type: "number" },
        ]}
        onSubmit={async (v) => { await action.mutateAsync({ path: "specifications", body: { specificationKey: v.specificationKey, specificationValue: v.specificationValue || undefined, unit: v.unit || undefined, acceptanceRangeMin: v.acceptanceRangeMin ? Number(v.acceptanceRangeMin) : undefined, acceptanceRangeMax: v.acceptanceRangeMax ? Number(v.acceptanceRangeMax) : undefined } }); }} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5">{value}</p></div>;
}
function Empty({ text }: { text: string }) { return <p className="text-body text-muted-foreground">{text}</p>; }
