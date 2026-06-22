"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { useEquipment, useEquipmentTrail, useEquipmentAction } from "@/hooks/useEquipment";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { ReasonModal } from "@/components/common/ReasonModal";
import { ActionFormModal } from "@/components/common/ActionFormModal";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { RecordDossierPanel } from "@/components/common/RecordDossierPanel";
import { formatDate } from "@/lib/format";
import { equipmentTypeLabel } from "@/types/equipment";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "calibration" | "maintenance" | "specs" | "audit";
type FormModal = null | "perform" | "schedule" | "maintenance" | "spec";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function ageInDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquipmentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const eq = useEquipment(id);
  const trail = useEquipmentTrail(id);
  const action = useEquipmentAction(id);

  const initialTab = (searchParams.get("tab") as TabKey) ?? "overview";
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [modal, setModal] = useState<FormModal>(null);
  const [retireOpen, setRetireOpen] = useState(false);

  if (eq.isLoading) return <LoadingScreen label="Loading equipment…" />;
  if (eq.isError || !eq.data) return <ErrorAlert title="Error" message="Failed to load this equipment." />;

  const e = eq.data;
  const active = e.status !== "RETIRED";
  const nextCalDays = daysUntil(e.nextCalibrationDate);
  const isCalOverdue = nextCalDays !== null && nextCalDays < 0 && e.status !== "RETIRED";
  const isCalDueSoon = nextCalDays !== null && nextCalDays >= 0 && nextCalDays <= 30 && e.status !== "RETIRED";

  const lastPassCal = [...e.calibrationHistory].reverse().find((c) => c.results === "PASS");
  const totalCals = e.calibrationHistory.length;
  const passCals = e.calibrationHistory.filter((c) => c.results === "PASS").length;
  const failCals = totalCals - passCals;

  const totalMaint = e.maintenanceHistory.length;
  const preventiveMaint = e.maintenanceHistory.filter((m) => m.maintenanceType === "PREVENTIVE").length;
  const correctiveMaint = totalMaint - preventiveMaint;

  return (
    <div className="space-y-4">
      {/* ── Breadcrumb + header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-label text-muted-foreground">
            <Link href="/equipment" className="hover:underline">Equipment</Link>
            <span>/</span>
            <span>{e.equipmentCode}</span>
          </div>
          <h1 className="text-h1 text-brand-primary">{e.equipmentName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <EquipmentStatusBadge status={e.status} />
            <Badge variant="neutral">{equipmentTypeLabel(e.equipmentType)}</Badge>
            {e.location && <span className="text-label text-muted-foreground">{e.location}</span>}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {active && (
            <>
              <Button onClick={() => setModal("perform")} disabled={action.isPending}>
                Perform Calibration
              </Button>
              <Button variant="outline" onClick={() => setModal("schedule")} disabled={action.isPending}>
                Schedule Cal.
              </Button>
              <Button variant="outline" onClick={() => setModal("maintenance")} disabled={action.isPending}>
                Record Maintenance
              </Button>
              <Button variant="ghost" onClick={() => setRetireOpen(true)} disabled={action.isPending}>
                Retire
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Warning banners ── */}
      {e.status === "OUT_OF_CALIBRATION" && (
        <div className="flex items-start gap-3 rounded-md border border-error/40 bg-error/10 px-4 py-3 text-body text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Equipment is out of calibration</p>
            <p className="text-label">This equipment must not be used for regulated activities until re-calibrated.</p>
          </div>
        </div>
      )}
      {isCalOverdue && e.status !== "OUT_OF_CALIBRATION" && (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-body text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Calibration overdue by {Math.abs(nextCalDays!)} day(s)</p>
            <p className="text-label">Due date was {formatDate(e.nextCalibrationDate)}. Schedule a calibration immediately.</p>
          </div>
        </div>
      )}
      {isCalDueSoon && (
        <div className="flex items-start gap-3 rounded-md border border-info/40 bg-info/10 px-4 py-3 text-body">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <div>
            <p className="font-semibold">Calibration due in {nextCalDays} day(s)</p>
            <p className="text-label text-muted-foreground">Scheduled for {formatDate(e.nextCalibrationDate)}.</p>
          </div>
        </div>
      )}

      {/* ── Key info strip ── */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-body sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Manufacturer" value={e.manufacturer} />
          <Meta label="Model" value={e.model} />
          <Meta label="Serial No." value={e.serialNumber} />
          <Meta label="Cal. Frequency" value={e.calibrationFrequencyMonths ? `${e.calibrationFrequencyMonths} months` : null} />
          <Meta label="Last Calibrated" value={formatDate(e.lastCalibrationDate)} />
          <Meta label="Next Calibration" value={formatDate(e.nextCalibrationDate)} />
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2">
          <Tabs
            active={tab}
            onChange={(k) => setTab(k as TabKey)}
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "calibration", label: "Calibration", count: totalCals },
              { key: "maintenance", label: "Maintenance", count: totalMaint },
              { key: "specs", label: "Specifications", count: e.specifications.length },
              { key: "audit", label: "Audit Trail" },
            ]}
          />
          {active && (
            <div className="ml-auto py-1 flex gap-2">
              {tab === "specs" && (
                <Button size="sm" variant="outline" onClick={() => setModal("spec")}>
                  <Plus className="h-4 w-4" /> Add Spec
                </Button>
              )}
              {tab === "maintenance" && (
                <Button size="sm" variant="outline" onClick={() => setModal("maintenance")}>
                  <Plus className="h-4 w-4" /> Record
                </Button>
              )}
              {tab === "calibration" && (
                <Button size="sm" variant="outline" onClick={() => setModal("perform")}>
                  <Plus className="h-4 w-4" /> Perform
                </Button>
              )}
            </div>
          )}
        </div>

        <CardContent className="pt-4">
          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Total Calibrations" value={totalCals} />
                <MetricCard label="Passed" value={passCals} color={passCals > 0 ? "text-success" : undefined} />
                <MetricCard label="Failed" value={failCals} color={failCals > 0 ? "text-error" : undefined} />
                <MetricCard label="Maintenance Records" value={totalMaint} />
              </div>

              <div>
                <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                  Equipment Status Checklist
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckItem label="Equipment Registered" ok detail={`Registered as ${e.equipmentCode}`} />
                  <CheckItem
                    label="Calibration Performed"
                    ok={totalCals > 0}
                    detail={totalCals > 0 ? `Last: ${formatDate(e.lastCalibrationDate)}` : "No calibration on record"}
                  />
                  <CheckItem
                    label="Last Calibration Passed"
                    ok={lastPassCal !== undefined}
                    detail={lastPassCal ? `Passed on ${formatDate(lastPassCal.calibrationDate)}` : "No passing calibration found"}
                  />
                  <CheckItem
                    label="Calibration Current"
                    ok={!isCalOverdue && nextCalDays !== null}
                    detail={
                      nextCalDays === null
                        ? "Next calibration not scheduled"
                        : isCalOverdue
                        ? `Overdue by ${Math.abs(nextCalDays!)} days`
                        : `Due in ${nextCalDays} days`
                    }
                  />
                  <CheckItem
                    label="Maintenance On Record"
                    ok={totalMaint > 0}
                    detail={totalMaint > 0 ? `${totalMaint} maintenance record(s)` : "No maintenance recorded"}
                  />
                  <CheckItem
                    label="Specifications Defined"
                    ok={e.specifications.length > 0}
                    detail={e.specifications.length > 0 ? `${e.specifications.length} specification(s)` : "No specifications defined"}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                  Asset Details
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-body sm:grid-cols-3">
                  <FieldRow label="Equipment Code" value={e.equipmentCode} />
                  <FieldRow label="Type" value={equipmentTypeLabel(e.equipmentType)} />
                  <FieldRow label="Location" value={e.location} />
                  <FieldRow label="Manufacturer" value={e.manufacturer} />
                  <FieldRow label="Model" value={e.model} />
                  <FieldRow label="Serial Number" value={e.serialNumber} />
                  <FieldRow label="Acquisition Date" value={formatDate(e.acquisitionDate)} />
                  <FieldRow label="Cal. Frequency" value={e.calibrationFrequencyMonths ? `${e.calibrationFrequencyMonths} months` : null} />
                  <FieldRow label="Equipment Age" value={`${ageInDays(e.createdAt)} days`} />
                  <FieldRow label="Status" value={e.status.replace(/_/g, " ")} />
                  <FieldRow label="Record Version" value={String(e.version)} />
                  <FieldRow label="Created" value={formatDate(e.createdAt)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Calibration tab ── */}
          {tab === "calibration" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatPill label="Total" value={totalCals} />
                <StatPill label="Passed" value={passCals} color="bg-success/15 text-success" />
                <StatPill label="Failed" value={failCals} color={failCals > 0 ? "bg-error/15 text-error" : undefined} />
                <StatPill
                  label="Next Due"
                  value={formatDate(e.nextCalibrationDate)}
                  color={
                    isCalOverdue
                      ? "bg-error/15 text-error"
                      : isCalDueSoon
                      ? "bg-warning/15 text-warning"
                      : "bg-success/15 text-success"
                  }
                />
              </div>

              {e.calibrationHistory.length === 0 ? (
                <Empty text="No calibrations recorded yet." />
              ) : (
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Result</th>
                      <th className="py-2 pr-4">Performed By</th>
                      <th className="py-2 pr-4">Next Due</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.calibrationHistory.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">{formatDate(c.calibrationDate)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={c.results === "PASS" ? "success" : "error"}>{c.results}</Badge>
                        </td>
                        <td className="py-2 pr-4">{c.performedByName ?? "—"}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{formatDate(c.nextCalibrationDate)}</td>
                        <td className="py-2 text-muted-foreground">{c.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Maintenance tab ── */}
          {tab === "maintenance" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatPill label="Total" value={totalMaint} />
                <StatPill label="Preventive" value={preventiveMaint} color="bg-info/15 text-info" />
                <StatPill label="Corrective" value={correctiveMaint} color={correctiveMaint > 0 ? "bg-warning/15 text-warning" : undefined} />
              </div>

              {e.maintenanceHistory.length === 0 ? (
                <Empty text="No maintenance recorded yet." />
              ) : (
                <table className="w-full text-body">
                  <thead>
                    <tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Work Description</th>
                      <th className="py-2 pr-4">Performed By</th>
                      <th className="py-2">Downtime (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.maintenanceHistory.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 whitespace-nowrap">{formatDate(m.maintenanceDate)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={m.maintenanceType === "PREVENTIVE" ? "info" : "warning"}>
                            {m.maintenanceType === "PREVENTIVE" ? "Preventive" : "Corrective"}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 max-w-[280px]">{m.workDescription}</td>
                        <td className="py-2 pr-4">{m.performedByName ?? "—"}</td>
                        <td className="py-2">{m.downtimeHours ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Specifications tab ── */}
          {tab === "specs" && (
            e.specifications.length === 0 ? (
              <Empty text="No specifications defined." />
            ) : (
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-border text-left text-label uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Parameter</th>
                    <th className="py-2 pr-4">Value</th>
                    <th className="py-2 pr-4">Unit</th>
                    <th className="py-2">Acceptance Range</th>
                  </tr>
                </thead>
                <tbody>
                  {e.specifications.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-medium">{s.specificationKey}</td>
                      <td className="py-2 pr-4">{s.specificationValue ?? "—"}</td>
                      <td className="py-2 pr-4">{s.unit ?? "—"}</td>
                      <td className="py-2">
                        {s.acceptanceRangeMin !== null || s.acceptanceRangeMax !== null
                          ? `${s.acceptanceRangeMin ?? "—"} – ${s.acceptanceRangeMax ?? "—"}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* ── Audit Trail tab ── */}
          {tab === "audit" && (
            <AuditTrailTable
              entries={trail.data}
              isLoading={trail.isLoading}
              isError={trail.isError}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Dossier panel ── */}
      <RecordDossierPanel
        recordType="Equipment"
        recordId={e.id}
        recordNumber={e.equipmentCode}
        title={e.equipmentName}
        fields={[
          { label: "Status", value: <EquipmentStatusBadge status={e.status} /> },
          { label: "Type", value: equipmentTypeLabel(e.equipmentType) },
          { label: "Location", value: e.location ?? "—" },
          { label: "Last Calibration", value: formatDate(e.lastCalibrationDate) },
          { label: "Next Calibration", value: formatDate(e.nextCalibrationDate) },
          { label: "Version", value: e.version },
        ]}
        sections={[
          {
            title: "Asset Identity",
            content: `${e.manufacturer ?? "Unknown manufacturer"} ${e.model ?? ""} ${e.serialNumber ? `— serial ${e.serialNumber}` : ""}`.trim(),
          },
          {
            title: "Calibration & Maintenance",
            content: `${totalCals} calibration(s) on record (${passCals} passed, ${failCals} failed). ${totalMaint} maintenance record(s).`,
          },
        ]}
      />

      {/* ── Perform Calibration modal ── */}
      <ActionFormModal
        open={modal === "perform"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Perform Calibration"
        isPending={action.isPending}
        successMessage="Calibration recorded"
        fields={[
          { name: "calibrationDate", label: "Calibration date", type: "date", required: true },
          {
            name: "result",
            label: "Result",
            type: "select",
            options: [{ value: "PASS", label: "Pass" }, { value: "FAIL", label: "Fail" }],
          },
          { name: "performedByName", label: "Performed by", type: "text" },
          { name: "calibrationDueDate", label: "Next due date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "perform-calibration",
            body: {
              expectedVersion: e.version,
              calibrationDate: v.calibrationDate,
              result: v.result,
              performedByName: v.performedByName || undefined,
              calibrationDueDate: v.calibrationDueDate || undefined,
              notes: v.notes || undefined,
            },
          });
        }}
      />

      {/* ── Schedule Calibration modal ── */}
      <ActionFormModal
        open={modal === "schedule"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Schedule Calibration"
        isPending={action.isPending}
        successMessage="Calibration scheduled"
        fields={[
          { name: "nextCalibrationDate", label: "Next calibration date", type: "date", required: true },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "schedule-calibration",
            body: { expectedVersion: e.version, nextCalibrationDate: v.nextCalibrationDate },
          });
        }}
      />

      {/* ── Record Maintenance modal ── */}
      <ActionFormModal
        open={modal === "maintenance"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Record Maintenance"
        isPending={action.isPending}
        successMessage="Maintenance recorded"
        fields={[
          { name: "maintenanceDate", label: "Date", type: "date", required: true },
          {
            name: "maintenanceType",
            label: "Type",
            type: "select",
            options: [{ value: "PREVENTIVE", label: "Preventive" }, { value: "CORRECTIVE", label: "Corrective" }],
          },
          { name: "workDescription", label: "Work description", type: "textarea", required: true },
          { name: "performedByName", label: "Performed by", type: "text" },
          { name: "downtimeHours", label: "Downtime (hours)", type: "number" },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "maintenance",
            body: {
              maintenanceDate: v.maintenanceDate,
              maintenanceType: v.maintenanceType,
              workDescription: v.workDescription,
              performedByName: v.performedByName || undefined,
              downtimeHours: v.downtimeHours ? Number(v.downtimeHours) : undefined,
            },
          });
        }}
      />

      {/* ── Add Specification modal ── */}
      <ActionFormModal
        open={modal === "spec"}
        onOpenChange={(o) => !o && setModal(null)}
        title="Add Specification"
        isPending={action.isPending}
        successMessage="Specification added"
        fields={[
          { name: "specificationKey", label: "Parameter name", type: "text", required: true },
          { name: "specificationValue", label: "Value", type: "text" },
          { name: "unit", label: "Unit", type: "text" },
          { name: "acceptanceRangeMin", label: "Acceptance min", type: "number" },
          { name: "acceptanceRangeMax", label: "Acceptance max", type: "number" },
        ]}
        onSubmit={async (v) => {
          await action.mutateAsync({
            path: "specifications",
            body: {
              specificationKey: v.specificationKey,
              specificationValue: v.specificationValue || undefined,
              unit: v.unit || undefined,
              acceptanceRangeMin: v.acceptanceRangeMin ? Number(v.acceptanceRangeMin) : undefined,
              acceptanceRangeMax: v.acceptanceRangeMax ? Number(v.acceptanceRangeMax) : undefined,
            },
          });
        }}
      />

      {/* ── Retire modal ── */}
      <ReasonModal
        open={retireOpen}
        onOpenChange={setRetireOpen}
        title="Retire Equipment"
        defaultReason="Retired"
        submitLabel="Confirm Retirement"
        isPending={action.isPending}
        onSubmit={async (reason) => {
          await action.mutateAsync({ path: "retire", body: { expectedVersion: e.version, reason } });
        }}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value ?? "—"}</p>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className={cn("text-2xl font-bold", color ?? "text-brand-primary")}>{value}</p>
        <p className="mt-0.5 text-label text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1 text-label font-semibold",
        color ?? "bg-muted text-muted-foreground"
      )}
    >
      <span>{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function CheckItem({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-body",
        ok ? "border-success/30 bg-success/5" : "border-error/30 bg-error/5"
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
      )}
      <div>
        <p className={cn("font-medium", ok ? "text-success" : "text-error")}>{label}</p>
        {detail && <p className="text-label text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-body text-muted-foreground">{text}</p>;
}
