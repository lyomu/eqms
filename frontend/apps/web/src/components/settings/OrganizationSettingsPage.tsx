"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  GitBranch,
  Hash,
  History,
  MapPin,
  Network,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminSettingsAuditLog,
  useAdminSettingsSummary,
  useApproveSettingsChangeRequest,
  useCreateSettingsChangeRequest,
  useNotificationTemplates,
  useNumberingSchemes,
  useRejectSettingsChangeRequest,
  useSettingsSection,
  useSettingsChangeRequests,
  useSettingsReferences,
  useUpdateNotificationTemplate,
  useUpdateNumberingScheme,
  useUpdateSettingsSection,
} from "@/hooks/useAdminSettings";
import type { NotificationTemplate, NumberingScheme, SettingsUpdateMetadata } from "@/lib/admin/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type SiteRow = {
  siteCode: string;
  siteName: string;
  siteType: string;
  country: string;
  cityRegion: string;
  qaResponsible: string;
  active: boolean;
};

type DepartmentRow = {
  departmentCode: string;
  departmentName: string;
  departmentHead: string;
  qaContact: string;
  site: string;
  status: string;
};

type ProcessRow = {
  processCode: string;
  processName: string;
  processOwner: string;
  department: string;
  processType: string;
  reviewFrequency: string;
  critical: boolean;
  status: string;
};

type ApprovalRule = {
  module: string;
  recordType: string;
  riskLevel: string;
  department: string;
  requiredReviewerRole: string;
  requiredApproverRole: string;
  approvalLevels: number;
  approvalMode: string;
  selfApprovalAllowed: boolean;
  esignatureRequired: boolean;
  commentsRequired: boolean;
  effectiveDate: string;
  status: string;
};

type ThresholdRow = {
  level: string;
  min: number;
  max: number;
};

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "profile", label: "Profile" },
  { key: "qms-scope", label: "QMS Scope" },
  { key: "sites", label: "Sites" },
  { key: "processes", label: "Departments & Processes" },
  { key: "approval-matrix", label: "Approval Matrix" },
  { key: "numbering", label: "Numbering" },
  { key: "risk", label: "Risk" },
  { key: "controls", label: "Controls" },
  { key: "module-settings", label: "Module Settings" },
  { key: "signatures", label: "E-Signatures" },
  { key: "integrations-review", label: "Integrations & Review" },
  { key: "notifications", label: "Notifications" },
  { key: "change-requests", label: "Change Requests" },
  { key: "history", label: "Change History" },
];

const checklistItems = [
  ["companyProfile", "Company profile"],
  ["sites", "Sites"],
  ["departments", "Departments"],
  ["users", "Users"],
  ["roles", "Roles"],
  ["approvalMatrix", "Approval matrix"],
  ["documentCategories", "Document categories"],
  ["materialCategories", "Material categories"],
  ["supplierRegister", "Supplier register"],
  ["productMaster", "Product master"],
] as const;

const standards = ["ISO 9001", "ISO 13485", "ISO 17025", "GMP", "Internal QMS Only", "Other"];
const moduleOptions = [
  "Documents",
  "Training",
  "CAPA",
  "Deviations",
  "NCR",
  "Change Control",
  "Risk",
  "Audit",
  "Supplier",
  "Equipment",
  "Materials",
  "OOS/OOT",
  "Complaints",
  "Management Review",
];

function isOrgAdmin(authorities?: string[]) {
  return (authorities ?? []).some((authority) => authority === "ROLE_ADMIN" || authority === "ADMIN");
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function linesToArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusVariant(status?: string | null): "success" | "warning" | "error" | "neutral" {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "active" || normalized === "approved" || normalized === "trialing") return "success";
  if (normalized === "draft" || normalized === "under review" || normalized === "past_due" || normalized === "expired") return "warning";
  if (normalized === "suspended" || normalized === "cancelled" || normalized === "archived") return "error";
  return "neutral";
}

function moduleLabel(code: string) {
  return code.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
      <span className="text-body">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-input text-primary"
      />
    </label>
  );
}

function ChangeControlPanel({
  reason,
  effectiveDate,
  impact,
  onReason,
  onEffectiveDate,
  onImpact,
}: {
  reason: string;
  effectiveDate: string;
  impact: string;
  onReason: (value: string) => void;
  onEffectiveDate: (value: string) => void;
  onImpact: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 md:grid-cols-[1.2fr_180px_1fr]">
      <Field label="Change reason">
        <Input value={reason} onChange={(event) => onReason(event.target.value)} />
      </Field>
      <Field label="Effective date">
        <Input type="date" value={effectiveDate} onChange={(event) => onEffectiveDate(event.target.value)} />
      </Field>
      <Field label="Change impact">
        <Input value={impact} onChange={(event) => onImpact(event.target.value)} />
      </Field>
    </div>
  );
}

export default function OrganizationAdminSettingsPage() {
  const { currentUser } = useAuth();
  const [active, setActive] = useState("overview");
  const summary = useAdminSettingsSummary();
  const qmsScopeQuery = useSettingsSection("qms-scope");
  const sitesQuery = useSettingsSection("sites");
  const processQuery = useSettingsSection("departments-processes");
  const approvalQuery = useSettingsSection("approval-matrix");
  const workflowQuery = useSettingsSection("workflow");
  const riskQuery = useSettingsSection("risk");
  const auditTrailQuery = useSettingsSection("audit-trail");
  const retentionQuery = useSettingsSection("data-retention");
  const localizationQuery = useSettingsSection("localization");
  const documentControlQuery = useSettingsSection("document-control");
  const trainingQuery = useSettingsSection("training");
  const auditSettingsQuery = useSettingsSection("audit");
  const supplierQuery = useSettingsSection("supplier");
  const equipmentQuery = useSettingsSection("equipment");
  const materialQuery = useSettingsSection("material");
  const qualityEventsQuery = useSettingsSection("quality-events");
  const oosComplaintQuery = useSettingsSection("oos-complaint");
  const changeControlQuery = useSettingsSection("change-control");
  const esignatureQuery = useSettingsSection("esignature");
  const integrationsQuery = useSettingsSection("integrations");
  const managementReviewQuery = useSettingsSection("management-review");
  const numbering = useNumberingSchemes();
  const templates = useNotificationTemplates();
  const audit = useAdminSettingsAuditLog();
  const references = useSettingsReferences();
  const changeRequests = useSettingsChangeRequests();
  const createQmsScopeRequest = useCreateSettingsChangeRequest("qms-scope");
  const createApprovalMatrixRequest = useCreateSettingsChangeRequest("approval-matrix");
  const approveChangeRequest = useApproveSettingsChangeRequest();
  const rejectChangeRequest = useRejectSettingsChangeRequest();

  const [general, setGeneral] = useState<Record<string, unknown>>({});
  const [onboarding, setOnboarding] = useState<Record<string, unknown>>({});
  const [qmsScope, setQmsScope] = useState<Record<string, unknown>>({});
  const [sitesSettings, setSitesSettings] = useState<Record<string, unknown>>({ sites: [] });
  const [processSettings, setProcessSettings] = useState<Record<string, unknown>>({ departments: [], processes: [] });
  const [approvalSettings, setApprovalSettings] = useState<Record<string, unknown>>({ rules: [] });
  const [workflow, setWorkflow] = useState<Record<string, unknown>>({});
  const [risk, setRisk] = useState<Record<string, unknown>>({});
  const [auditTrail, setAuditTrail] = useState<Record<string, unknown>>({});
  const [retention, setRetention] = useState<Record<string, unknown>>({});
  const [localization, setLocalization] = useState<Record<string, unknown>>({});
  const [documentControl, setDocumentControl] = useState<Record<string, unknown>>({});
  const [trainingSettings, setTrainingSettings] = useState<Record<string, unknown>>({});
  const [auditSettings, setAuditSettings] = useState<Record<string, unknown>>({});
  const [supplierSettings, setSupplierSettings] = useState<Record<string, unknown>>({});
  const [equipmentSettings, setEquipmentSettings] = useState<Record<string, unknown>>({});
  const [materialSettings, setMaterialSettings] = useState<Record<string, unknown>>({});
  const [qualityEvents, setQualityEvents] = useState<Record<string, unknown>>({});
  const [oosComplaint, setOosComplaint] = useState<Record<string, unknown>>({});
  const [changeControlSettings, setChangeControlSettings] = useState<Record<string, unknown>>({});
  const [esignature, setEsignature] = useState<Record<string, unknown>>({});
  const [integrations, setIntegrations] = useState<Record<string, unknown>>({});
  const [managementReview, setManagementReview] = useState<Record<string, unknown>>({});
  const [changeReason, setChangeReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [changeImpact, setChangeImpact] = useState("");

  const updateGeneral = useUpdateSettingsSection("general");
  const updateOnboarding = useUpdateSettingsSection("onboarding");
  const updateQmsScope = useUpdateSettingsSection("qms-scope");
  const updateSites = useUpdateSettingsSection("sites");
  const updateProcesses = useUpdateSettingsSection("departments-processes");
  const updateApproval = useUpdateSettingsSection("approval-matrix");
  const updateWorkflow = useUpdateSettingsSection("workflow");
  const updateRisk = useUpdateSettingsSection("risk");
  const updateAuditTrail = useUpdateSettingsSection("audit-trail");
  const updateRetention = useUpdateSettingsSection("data-retention");
  const updateLocalization = useUpdateSettingsSection("localization");
  const updateDocumentControl = useUpdateSettingsSection("document-control");
  const updateTrainingSettings = useUpdateSettingsSection("training");
  const updateAuditSettings = useUpdateSettingsSection("audit");
  const updateSupplierSettings = useUpdateSettingsSection("supplier");
  const updateEquipmentSettings = useUpdateSettingsSection("equipment");
  const updateMaterialSettings = useUpdateSettingsSection("material");
  const updateQualityEvents = useUpdateSettingsSection("quality-events");
  const updateOosComplaint = useUpdateSettingsSection("oos-complaint");
  const updateChangeControlSettings = useUpdateSettingsSection("change-control");
  const updateEsignature = useUpdateSettingsSection("esignature");
  const updateIntegrations = useUpdateSettingsSection("integrations");
  const updateManagementReview = useUpdateSettingsSection("management-review");
  const updateNumbering = useUpdateNumberingScheme();
  const updateTemplate = useUpdateNotificationTemplate();

  useEffect(() => {
    if (summary.data?.general) setGeneral(summary.data.general);
    if (summary.data?.onboarding) setOnboarding(summary.data.onboarding);
  }, [summary.data]);

  useEffect(() => {
    function warnIfCriticalChangeInProgress(event: BeforeUnloadEvent) {
      if (changeReason.trim() || changeImpact.trim()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warnIfCriticalChangeInProgress);
    return () => window.removeEventListener("beforeunload", warnIfCriticalChangeInProgress);
  }, [changeReason, changeImpact]);

  useEffect(() => {
    if (qmsScopeQuery.data) setQmsScope(qmsScopeQuery.data);
  }, [qmsScopeQuery.data]);

  useEffect(() => {
    if (sitesQuery.data) setSitesSettings(sitesQuery.data);
  }, [sitesQuery.data]);

  useEffect(() => {
    if (processQuery.data) setProcessSettings(processQuery.data);
  }, [processQuery.data]);

  useEffect(() => {
    if (approvalQuery.data) setApprovalSettings(approvalQuery.data);
  }, [approvalQuery.data]);

  useEffect(() => {
    if (workflowQuery.data) setWorkflow(workflowQuery.data);
  }, [workflowQuery.data]);

  useEffect(() => {
    if (riskQuery.data) setRisk(riskQuery.data);
  }, [riskQuery.data]);

  useEffect(() => {
    if (auditTrailQuery.data) setAuditTrail(auditTrailQuery.data);
  }, [auditTrailQuery.data]);

  useEffect(() => {
    if (retentionQuery.data) setRetention(retentionQuery.data);
  }, [retentionQuery.data]);

  useEffect(() => {
    if (localizationQuery.data) setLocalization(localizationQuery.data);
  }, [localizationQuery.data]);

  useEffect(() => {
    if (documentControlQuery.data) setDocumentControl(documentControlQuery.data);
  }, [documentControlQuery.data]);

  useEffect(() => {
    if (trainingQuery.data) setTrainingSettings(trainingQuery.data);
  }, [trainingQuery.data]);

  useEffect(() => {
    if (auditSettingsQuery.data) setAuditSettings(auditSettingsQuery.data);
  }, [auditSettingsQuery.data]);

  useEffect(() => {
    if (supplierQuery.data) setSupplierSettings(supplierQuery.data);
  }, [supplierQuery.data]);

  useEffect(() => {
    if (equipmentQuery.data) setEquipmentSettings(equipmentQuery.data);
  }, [equipmentQuery.data]);

  useEffect(() => {
    if (materialQuery.data) setMaterialSettings(materialQuery.data);
  }, [materialQuery.data]);

  useEffect(() => {
    if (qualityEventsQuery.data) setQualityEvents(qualityEventsQuery.data);
  }, [qualityEventsQuery.data]);

  useEffect(() => {
    if (oosComplaintQuery.data) setOosComplaint(oosComplaintQuery.data);
  }, [oosComplaintQuery.data]);

  useEffect(() => {
    if (changeControlQuery.data) setChangeControlSettings(changeControlQuery.data);
  }, [changeControlQuery.data]);

  useEffect(() => {
    if (esignatureQuery.data) setEsignature(esignatureQuery.data);
  }, [esignatureQuery.data]);

  useEffect(() => {
    if (integrationsQuery.data) setIntegrations(integrationsQuery.data);
  }, [integrationsQuery.data]);

  useEffect(() => {
    if (managementReviewQuery.data) setManagementReview(managementReviewQuery.data);
  }, [managementReviewQuery.data]);

  const onboardingProgress = useMemo(() => {
    const completed = checklistItems.filter(([key]) => booleanValue(onboarding[key])).length;
    return Math.round((completed / checklistItems.length) * 100);
  }, [onboarding]);

  const healthWarnings = summary.data?.configurationHealth ?? [];
  const criticalMetadata = (): SettingsUpdateMetadata => ({
    changeReason,
    effectiveDate,
    changeImpact,
    approvalStatus: "Not Required",
  });
  const canSaveCritical = changeReason.trim().length > 0 && effectiveDate.trim().length > 0;

  if (!isOrgAdmin(currentUser?.authorities)) {
    return (
      <div className="max-w-2xl">
        <ErrorAlert
          title="Admin access required"
          message="Organization settings are available only to administrators in your organization."
        />
      </div>
    );
  }

  if (summary.isLoading) {
    return <LoadingScreen label="Loading organization settings" />;
  }

  if (summary.isError) {
    return (
      <ErrorAlert
        title="Settings unavailable"
        message="The organization settings could not be loaded. Refresh the session and try again."
      />
    );
  }

  const license = summary.data?.license;
  const siteRows = arrayValue<SiteRow>(sitesSettings.sites);
  const departments = arrayValue<DepartmentRow>(processSettings.departments);
  const processes = arrayValue<ProcessRow>(processSettings.processes);
  const approvalRules = arrayValue<ApprovalRule>(approvalSettings.rules);
  const thresholds = arrayValue<ThresholdRow>(risk.thresholds);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">Organization Settings</h1>
          <p className="text-body text-muted-foreground">
            Configure tenant-wide QMS controls, scope, ownership, approvals, and audit-ready settings.
          </p>
        </div>
        <Badge variant="info" className="ml-auto">
          Tenant scoped
        </Badge>
      </div>

      {healthWarnings.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {healthWarnings.slice(0, 4).map((warning) => (
            <div key={textValue(warning.key)} className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-body font-medium">{textValue(warning.title)}</p>
                <p className="text-label text-muted-foreground">{textValue(warning.message)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={<Building2 className="h-5 w-5" />}
          label="Organization"
          value={license?.organizationName ?? textValue(general.companyName, "Organization")}
          detail={`ID ${license?.organizationId ?? currentUser?.organizationId ?? "-"}`}
        />
        <SummaryCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="License"
          value={license?.licenseStatus ?? "Unknown"}
          detail={license?.planName ?? "No plan assigned"}
          badge={statusVariant(license?.licenseStatus)}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Setup"
          value={`${onboardingProgress}% complete`}
          detail="Configuration readiness"
        />
        <SummaryCard
          icon={<Users className="h-5 w-5" />}
          label="Users"
          value={`${license?.userCount ?? 0}${license?.userLimit ? ` / ${license.userLimit}` : ""}`}
          detail="Licensed seats"
        />
      </div>

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      {active === "overview" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Health</CardTitle>
              <CardDescription>Lightweight setup indicators only. Operational trends stay in dashboards and reports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {healthWarnings.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-body">No critical configuration warnings.</span>
                </div>
              ) : (
                healthWarnings.map((warning) => (
                  <div key={textValue(warning.key)} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-body">{textValue(warning.title)}</span>
                    <Badge variant="warning">Open</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Checklist</CardTitle>
              <CardDescription>Readiness items for controlled organization use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklistItems.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-body">{label}</span>
                  <Badge variant={booleanValue(onboarding[key]) ? "success" : "neutral"}>
                    {booleanValue(onboarding[key]) ? "Done" : "Open"}
                  </Badge>
                </div>
              ))}
              <Button onClick={() => updateOnboarding.mutate(onboarding)} disabled={updateOnboarding.isPending}>
                <Save className="h-4 w-4" />
                {updateOnboarding.isPending ? "Saving..." : "Save checklist"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users, Roles & Permissions
              </CardTitle>
              <CardDescription>References only. User and role administration remains controlled by backend RBAC.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-label text-muted-foreground">Users</p>
                <p className="text-h3 text-brand-primary">{references.data?.users.length ?? 0}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-label text-muted-foreground">Roles</p>
                <p className="text-h3 text-brand-primary">{references.data?.roles.length ?? 0}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-label text-muted-foreground">Departments</p>
                <p className="text-h3 text-brand-primary">{references.data?.departments.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {active === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Profile
            </CardTitle>
            <CardDescription>Legal identity, contact, and localization defaults for this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Organization name">
                <Input value={textValue(general.companyName)} onChange={(e) => setGeneral((p) => ({ ...p, companyName: e.target.value }))} />
              </Field>
              <Field label="Legal name">
                <Input value={textValue(general.legalName)} onChange={(e) => setGeneral((p) => ({ ...p, legalName: e.target.value }))} />
              </Field>
              <Field label="Organization code">
                <Input value={textValue(general.organizationCode)} onChange={(e) => setGeneral((p) => ({ ...p, organizationCode: e.target.value }))} />
              </Field>
              <Field label="Registration number">
                <Input value={textValue(general.registrationNumber)} onChange={(e) => setGeneral((p) => ({ ...p, registrationNumber: e.target.value }))} />
              </Field>
              <Field label="Tax/VAT/PIN number">
                <Input value={textValue(general.taxNumber)} onChange={(e) => setGeneral((p) => ({ ...p, taxNumber: e.target.value }))} />
              </Field>
              <Field label="Organization type">
                <Select value={textValue(general.organizationType, "Pharmaceutical Company")} onChange={(e) => setGeneral((p) => ({ ...p, organizationType: e.target.value }))}>
                  {["Manufacturer", "Laboratory", "Distributor", "Healthcare Provider", "Medical Device Company", "Pharmaceutical Company", "Food/Agriculture", "Service Provider", "Other"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Primary contact person">
                <Input value={textValue(general.primaryContactPerson)} onChange={(e) => setGeneral((p) => ({ ...p, primaryContactPerson: e.target.value }))} />
              </Field>
              <Field label="Primary email">
                <Input type="email" value={textValue(general.supportEmail)} onChange={(e) => setGeneral((p) => ({ ...p, supportEmail: e.target.value }))} />
              </Field>
              <Field label="Primary phone">
                <Input value={textValue(general.supportPhone)} onChange={(e) => setGeneral((p) => ({ ...p, supportPhone: e.target.value }))} />
              </Field>
              <Field label="Country">
                <Input value={textValue(general.country)} onChange={(e) => setGeneral((p) => ({ ...p, country: e.target.value }))} />
              </Field>
              <Field label="City/Region">
                <Input value={textValue(general.cityRegion)} onChange={(e) => setGeneral((p) => ({ ...p, cityRegion: e.target.value }))} />
              </Field>
              <Field label="Status">
                <Select value={textValue(general.organizationStatus, "Active")} onChange={(e) => setGeneral((p) => ({ ...p, organizationStatus: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Archived">Archived</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Physical address">
                <Textarea value={textValue(general.physicalAddress)} onChange={(e) => setGeneral((p) => ({ ...p, physicalAddress: e.target.value }))} />
              </Field>
              <Field label="Postal address">
                <Textarea value={textValue(general.postalAddress)} onChange={(e) => setGeneral((p) => ({ ...p, postalAddress: e.target.value }))} />
              </Field>
            </div>
            <Button onClick={() => updateGeneral.mutate(general)} disabled={updateGeneral.isPending}>
              <Save className="h-4 w-4" />
              {updateGeneral.isPending ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>
      )}

      {active === "qms-scope" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              QMS Scope
            </CardTitle>
            <CardDescription>Define what the QMS covers, who owns it, and when it must be reviewed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="QMS scope statement">
              <Textarea value={textValue(qmsScope.scopeStatement)} onChange={(e) => setQmsScope((p) => ({ ...p, scopeStatement: e.target.value }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Products / services covered">
                <Textarea value={textValue(qmsScope.productsServicesCovered)} onChange={(e) => setQmsScope((p) => ({ ...p, productsServicesCovered: e.target.value }))} />
              </Field>
              <Field label="Exclusions / non-applicable areas">
                <Textarea value={textValue(qmsScope.exclusions)} onChange={(e) => setQmsScope((p) => ({ ...p, exclusions: e.target.value }))} />
              </Field>
              <Field label="Sites covered">
                <Input value={textValue(qmsScope.sitesCovered)} onChange={(e) => setQmsScope((p) => ({ ...p, sitesCovered: e.target.value }))} />
              </Field>
              <Field label="Departments covered">
                <Input value={textValue(qmsScope.departmentsCovered)} onChange={(e) => setQmsScope((p) => ({ ...p, departmentsCovered: e.target.value }))} />
              </Field>
              <Field label="QMS scope owner">
                <Input value={textValue(qmsScope.scopeOwner)} onChange={(e) => setQmsScope((p) => ({ ...p, scopeOwner: e.target.value }))} />
              </Field>
              <Field label="QMS scope approver">
                <Input value={textValue(qmsScope.scopeApprover)} onChange={(e) => setQmsScope((p) => ({ ...p, scopeApprover: e.target.value }))} />
              </Field>
              <Field label="Next review date">
                <Input type="date" value={textValue(qmsScope.nextReviewDate)} onChange={(e) => setQmsScope((p) => ({ ...p, nextReviewDate: e.target.value }))} />
              </Field>
              <Field label="Scope status">
                <Select value={textValue(qmsScope.scopeStatus, "Draft")} onChange={(e) => setQmsScope((p) => ({ ...p, scopeStatus: e.target.value }))}>
                  <option value="Draft">Draft</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Requires Update">Requires Update</option>
                  <option value="Archived">Archived</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {standards.map((standard) => {
                const selected = arrayValue<string>(qmsScope.applicableStandards).includes(standard);
                return (
                  <ToggleRow
                    key={standard}
                    label={standard}
                    checked={selected}
                    onChange={(checked) =>
                      setQmsScope((prev) => {
                        const current = arrayValue<string>(prev.applicableStandards);
                        return {
                          ...prev,
                          applicableStandards: checked
                            ? Array.from(new Set([...current, standard]))
                            : current.filter((item) => item !== standard),
                        };
                      })
                    }
                  />
                );
              })}
            </div>
            <ChangeControlPanel
              reason={changeReason}
              effectiveDate={effectiveDate}
              impact={changeImpact}
              onReason={setChangeReason}
              onEffectiveDate={setEffectiveDate}
              onImpact={setChangeImpact}
            />
            <Button
              onClick={() => updateQmsScope.mutate({ values: qmsScope, metadata: criticalMetadata() })}
              disabled={updateQmsScope.isPending || !canSaveCritical}
            >
              <Save className="h-4 w-4" />
              {updateQmsScope.isPending ? "Saving..." : "Save QMS scope"}
            </Button>
            <Button
              variant="outline"
              onClick={() => createQmsScopeRequest.mutate({ values: qmsScope, metadata: criticalMetadata() })}
              disabled={createQmsScopeRequest.isPending || !canSaveCritical}
            >
              <GitBranch className="h-4 w-4" />
              {createQmsScopeRequest.isPending ? "Submitting..." : "Submit for approval"}
            </Button>
          </CardContent>
        </Card>
      )}

      {active === "sites" && (
        <ConfigRowsCard
          title="Sites & Locations"
          description="Configure active sites and accountability. Deactivated sites should not be selected for new records."
          icon={<MapPin className="h-5 w-5" />}
          onAdd={() =>
            setSitesSettings((prev) => ({
              ...prev,
              sites: [
                ...arrayValue<SiteRow>(prev.sites),
                { siteCode: "", siteName: "", siteType: "Manufacturing Site", country: "", cityRegion: "", qaResponsible: "", active: true },
              ],
            }))
          }
          onSave={() => updateSites.mutate({ values: sitesSettings, metadata: criticalMetadata() })}
          saving={updateSites.isPending}
          saveDisabled={!canSaveCritical}
        >
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          {siteRows.map((site, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[.8fr_1.2fr_1fr_1fr_1fr_1fr_auto]">
              <Input aria-label="Site code" value={site.siteCode} onChange={(e) => updateSite(index, { siteCode: e.target.value })} placeholder="Code" />
              <Input aria-label="Site name" value={site.siteName} onChange={(e) => updateSite(index, { siteName: e.target.value })} placeholder="Site name" />
              <Select aria-label="Site type" value={site.siteType} onChange={(e) => updateSite(index, { siteType: e.target.value })}>
                {["Head Office", "Manufacturing Site", "Laboratory", "Warehouse", "Distribution Site", "Service Site", "Supplier Site", "Other"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </Select>
              <Input aria-label="Country" value={site.country} onChange={(e) => updateSite(index, { country: e.target.value })} placeholder="Country" />
              <Input aria-label="City" value={site.cityRegion} onChange={(e) => updateSite(index, { cityRegion: e.target.value })} placeholder="City/Region" />
              <Input aria-label="QA responsible" value={site.qaResponsible} onChange={(e) => updateSite(index, { qaResponsible: e.target.value })} placeholder="QA responsible" />
              <IconButton label="Remove site" onClick={() => removeSite(index)} />
            </div>
          ))}
          {siteRows.length === 0 && <EmptyState text="No sites configured yet." />}
        </ConfigRowsCard>
      )}

      {active === "processes" && (
        <ConfigRowsCard
          title="Departments & Processes"
          description="Define accountability for departments and critical processes."
          icon={<Network className="h-5 w-5" />}
          onAdd={() => addDepartment()}
          secondaryAddLabel="Add process"
          onSecondaryAdd={() => addProcess()}
          onSave={() => updateProcesses.mutate({ values: processSettings, metadata: criticalMetadata() })}
          saving={updateProcesses.isPending}
          saveDisabled={!canSaveCritical}
        >
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          <h3 className="text-h3 text-brand-primary">Departments</h3>
          {departments.map((department, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[.8fr_1.2fr_1fr_1fr_1fr_auto]">
              <Input value={department.departmentCode} onChange={(e) => updateDepartment(index, { departmentCode: e.target.value })} placeholder="Code" />
              <Input value={department.departmentName} onChange={(e) => updateDepartment(index, { departmentName: e.target.value })} placeholder="Department name" />
              <Input value={department.departmentHead} onChange={(e) => updateDepartment(index, { departmentHead: e.target.value })} placeholder="Department head" />
              <Input value={department.qaContact} onChange={(e) => updateDepartment(index, { qaContact: e.target.value })} placeholder="QA contact" />
              <Input value={department.site} onChange={(e) => updateDepartment(index, { site: e.target.value })} placeholder="Site" />
              <IconButton label="Remove department" onClick={() => removeDepartment(index)} />
            </div>
          ))}
          <h3 className="text-h3 text-brand-primary">Processes</h3>
          {processes.map((process, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[.8fr_1.2fr_1fr_1fr_1fr_auto]">
              <Input value={process.processCode} onChange={(e) => updateProcess(index, { processCode: e.target.value })} placeholder="Code" />
              <Input value={process.processName} onChange={(e) => updateProcess(index, { processName: e.target.value })} placeholder="Process name" />
              <Input value={process.processOwner} onChange={(e) => updateProcess(index, { processOwner: e.target.value })} placeholder="Owner" />
              <Select value={process.processType} onChange={(e) => updateProcess(index, { processType: e.target.value })}>
                {["Management Process", "Core / Operational Process", "Support Process", "Quality Process"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </Select>
              <label className="flex items-center gap-2 text-body">
                <input type="checkbox" checked={process.critical} onChange={(e) => updateProcess(index, { critical: e.target.checked })} className="h-4 w-4 rounded border-input text-primary" />
                Critical
              </label>
              <IconButton label="Remove process" onClick={() => removeProcess(index)} />
            </div>
          ))}
        </ConfigRowsCard>
      )}

      {active === "approval-matrix" && (
        <ConfigRowsCard
          title="Approval Matrix"
          description="Configure reviewer and approver expectations by module, risk, and department."
          icon={<GitBranch className="h-5 w-5" />}
          onAdd={() => addApprovalRule()}
          onSave={() => updateApproval.mutate({ values: approvalSettings, metadata: criticalMetadata() })}
          saving={updateApproval.isPending}
          saveDisabled={!canSaveCritical}
        >
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          {approvalRules.map((rule, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-border p-3 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_.8fr_auto]">
              <Select value={rule.module} onChange={(e) => updateApprovalRule(index, { module: e.target.value })}>
                {moduleOptions.map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
              <Input value={rule.department} onChange={(e) => updateApprovalRule(index, { department: e.target.value })} placeholder="Department" />
              <Select value={rule.riskLevel} onChange={(e) => updateApprovalRule(index, { riskLevel: e.target.value })}>
                {["Any", "Low", "Medium", "High", "Critical"].map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
              <Input value={rule.requiredReviewerRole} onChange={(e) => updateApprovalRule(index, { requiredReviewerRole: e.target.value })} placeholder="Reviewer role" />
              <Input value={rule.requiredApproverRole} onChange={(e) => updateApprovalRule(index, { requiredApproverRole: e.target.value })} placeholder="Approver role" />
              <Input type="date" value={rule.effectiveDate} onChange={(e) => updateApprovalRule(index, { effectiveDate: e.target.value })} />
              <IconButton label="Remove rule" onClick={() => removeApprovalRule(index)} />
            </div>
          ))}
          {approvalRules.length === 0 && <EmptyState text="No approval rules configured yet." />}
          <Button
            variant="outline"
            onClick={() => createApprovalMatrixRequest.mutate({ values: approvalSettings, metadata: criticalMetadata() })}
            disabled={createApprovalMatrixRequest.isPending || !canSaveCritical}
          >
            <GitBranch className="h-4 w-4" />
            {createApprovalMatrixRequest.isPending ? "Submitting..." : "Submit approval matrix for approval"}
          </Button>
        </ConfigRowsCard>
      )}

      {active === "numbering" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Numbering & Codes
            </CardTitle>
            <CardDescription>Configure tenant-specific record number previews by module.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {numbering.isLoading && <LoadingScreen label="Loading numbering schemes" />}
            {numbering.data?.map((scheme) => (
              <NumberingRow
                key={scheme.moduleCode}
                scheme={scheme}
                saving={updateNumbering.isPending}
                onSave={(values) => updateNumbering.mutate({ moduleCode: scheme.moduleCode, values })}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {active === "risk" && (
        <ConfigRowsCard
          title="Risk Settings"
          description="Configure scoring method, acceptance thresholds, and risk approval expectations."
          icon={<ShieldCheck className="h-5 w-5" />}
          onAdd={() => setRisk((prev) => ({ ...prev, thresholds: [...arrayValue<ThresholdRow>(prev.thresholds), { level: "New", min: 1, max: 1 }] }))}
          onSave={() => updateRisk.mutate({ values: risk, metadata: criticalMetadata() })}
          saving={updateRisk.isPending}
          saveDisabled={!canSaveCritical}
        >
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Risk scoring method">
              <Select value={textValue(risk.scoringMethod, "3-Factor FMEA / RPN")} onChange={(e) => setRisk((p) => ({ ...p, scoringMethod: e.target.value }))}>
                <option value="2-Factor Matrix">2-Factor Matrix</option>
                <option value="3-Factor FMEA / RPN">3-Factor FMEA / RPN</option>
                <option value="Custom">Custom</option>
              </Select>
            </Field>
            <Field label="High risk approver role">
              <Input value={textValue(risk.highRiskApproverRole)} onChange={(e) => setRisk((p) => ({ ...p, highRiskApproverRole: e.target.value }))} />
            </Field>
            <ToggleRow
              label="Residual risk acceptance required"
              checked={booleanValue(risk.residualRiskAcceptanceRequired, true)}
              onChange={(checked) => setRisk((p) => ({ ...p, residualRiskAcceptanceRequired: checked }))}
            />
          </div>
          {thresholds.map((threshold, index) => (
            <div key={index} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Input value={threshold.level} onChange={(e) => updateThreshold(index, { level: e.target.value })} placeholder="Level" />
              <Input type="number" value={threshold.min} onChange={(e) => updateThreshold(index, { min: Number(e.target.value) })} placeholder="Min" />
              <Input type="number" value={threshold.max} onChange={(e) => updateThreshold(index, { max: Number(e.target.value) })} placeholder="Max" />
              <IconButton label="Remove threshold" onClick={() => removeThreshold(index)} />
            </div>
          ))}
        </ConfigRowsCard>
      )}

      {active === "controls" && (
        <div className="space-y-4">
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          <div className="grid gap-4 xl:grid-cols-2">
            <ControlCard
              title="Workflow Settings"
              icon={<GitBranch className="h-5 w-5" />}
              values={workflow}
              onChange={setWorkflow}
              fields={[
                ["approvalWorkflowEnabled", "Enable approval workflow"],
                ["requiredCommentsForRejection", "Require comments for rejection"],
                ["requiredEvidenceBeforeApproval", "Require evidence before approval"],
                ["allowReopeningClosedRecords", "Allow reopening closed records"],
                ["allowEditingApprovedRecords", "Allow editing approved records"],
                ["closureRequiresQaApproval", "Closure requires QA approval"],
              ]}
              onSave={() => updateWorkflow.mutate({ values: workflow, metadata: criticalMetadata() })}
              saving={updateWorkflow.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Audit Trail & Data Integrity"
              icon={<ShieldCheck className="h-5 w-5" />}
              values={auditTrail}
              onChange={setAuditTrail}
              fields={[
                ["auditTrailEnabled", "Audit trail enabled"],
                ["captureOldNewValues", "Capture old/new values"],
                ["captureReasonForChange", "Capture reason for change"],
                ["requireReasonForCriticalChanges", "Require reason for critical changes"],
                ["preventHardDeleteApprovedRecords", "Prevent hard delete of approved records"],
                ["lockApprovedRecords", "Lock approved records"],
                ["lockClosedRecords", "Lock closed records"],
                ["allowAmendmentsRevisions", "Allow amendments/revisions"],
                ["adminOverrideAllowed", "Admin override allowed"],
              ]}
              onSave={() => updateAuditTrail.mutate({ values: auditTrail, metadata: criticalMetadata() })}
              saving={updateAuditTrail.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Record Retention & Archive"
              icon={<CalendarDays className="h-5 w-5" />}
              values={retention}
              onChange={setRetention}
              fields={[
                ["archiveEnabled", "Archive enabled"],
                ["purgeEnabled", "Purge enabled"],
                ["softDeleteEnabled", "Soft delete enabled"],
                ["hardDeleteAllowed", "Hard delete allowed"],
                ["legalHoldEnabled", "Legal hold enabled"],
              ]}
              numericFields={[["retentionYears", "Retention years"]]}
              onSave={() => updateRetention.mutate({ values: retention, metadata: criticalMetadata() })}
              saving={updateRetention.isPending}
              saveDisabled={!canSaveCritical}
            />
            <LocalizationCard values={localization} onChange={setLocalization} onSave={() => updateLocalization.mutate(localization)} saving={updateLocalization.isPending} />
          </div>
        </div>
      )}

      {active === "module-settings" && (
        <div className="space-y-4">
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          <div className="grid gap-4 xl:grid-cols-2">
            <ControlCard
              title="Document Control Settings"
              icon={<FileText className="h-5 w-5" />}
              values={documentControl}
              onChange={setDocumentControl}
              fields={[
                ["effectiveDateRequired", "Effective date required"],
                ["periodicReviewRequired", "Periodic review required"],
                ["obsoleteControlEnabled", "Obsolete document control enabled"],
                ["trainingRequiredOnNewRevision", "Training required on new revision"],
                ["approvalWorkflowRequired", "Approval workflow required"],
                ["draftObsoleteWatermarksEnabled", "Draft/obsolete watermarks enabled"],
              ]}
              numericFields={[["defaultReviewFrequencyMonths", "Default review frequency months"]]}
              onSave={() => updateDocumentControl.mutate({ values: documentControl, metadata: criticalMetadata() })}
              saving={updateDocumentControl.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Training Settings"
              icon={<ClipboardList className="h-5 w-5" />}
              values={trainingSettings}
              onChange={setTrainingSettings}
              fields={[
                ["trainingRequiredByRole", "Training required by role"],
                ["sopLinkedTrainingEnabled", "SOP-linked training enabled"],
                ["retrainingAfterDocumentRevision", "Retraining after document revision"],
                ["assessmentRequired", "Assessment/quiz required"],
                ["competenceApprovalRequired", "Competence approval required"],
                ["trainingEvidenceRequired", "Training evidence required"],
              ]}
              numericFields={[["passingScore", "Passing score"]]}
              onSave={() => updateTrainingSettings.mutate({ values: trainingSettings, metadata: criticalMetadata() })}
              saving={updateTrainingSettings.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Audit Settings"
              icon={<ShieldCheck className="h-5 w-5" />}
              values={auditSettings}
              onChange={setAuditSettings}
              fields={[
                ["riskBasedFrequencyEnabled", "Risk-based audit frequency"],
                ["auditorIndependenceRequired", "Auditor independence required"],
                ["evidenceRequiredForFindings", "Evidence required for findings"],
                ["capaRequiredForMajorFindings", "CAPA required for major findings"],
                ["auditReportApprovalRequired", "Audit report approval required"],
                ["followUpRequired", "Follow-up required"],
              ]}
              numericFields={[["defaultAuditFrequencyMonths", "Default audit frequency months"]]}
              onSave={() => updateAuditSettings.mutate({ values: auditSettings, metadata: criticalMetadata() })}
              saving={updateAuditSettings.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Supplier Settings"
              icon={<Users className="h-5 w-5" />}
              values={supplierSettings}
              onChange={setSupplierSettings}
              fields={[
                ["qualificationRequired", "Supplier qualification required"],
                ["riskAssessmentRequired", "Supplier risk assessment required"],
                ["qualityAgreementRequiredForCritical", "Quality agreement required for critical suppliers"],
                ["approvedSupplierRequiredBeforeReceipt", "Approved supplier required before receipt"],
                ["conditionalApprovalAllowed", "Conditional approval allowed"],
                ["blockSuspendedSuppliers", "Block suspended suppliers"],
                ["blockDisqualifiedSuppliers", "Block disqualified suppliers"],
              ]}
              onSave={() => updateSupplierSettings.mutate({ values: supplierSettings, metadata: criticalMetadata() })}
              saving={updateSupplierSettings.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Equipment Settings"
              icon={<SlidersHorizontal className="h-5 w-5" />}
              values={equipmentSettings}
              onChange={setEquipmentSettings}
              fields={[
                ["qualificationRequired", "Equipment qualification required"],
                ["calibrationRequired", "Calibration required"],
                ["preventiveMaintenanceRequired", "Preventive maintenance required"],
                ["returnToServiceApprovalRequired", "Return-to-service approval required"],
                ["blockUseWhenCalibrationOverdue", "Block use when calibration overdue"],
                ["blockUseWhenMaintenanceOverdue", "Block use when maintenance overdue"],
                ["blockUseWhenNotQualified", "Block use when not qualified"],
                ["blockUseWhenOutOfService", "Block use when out of service"],
              ]}
              onSave={() => updateEquipmentSettings.mutate({ values: equipmentSettings, metadata: criticalMetadata() })}
              saving={updateEquipmentSettings.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Material Settings"
              icon={<Hash className="h-5 w-5" />}
              values={materialSettings}
              onChange={setMaterialSettings}
              fields={[
                ["qaReleaseRequired", "QA release required"],
                ["supplierApprovalRequired", "Supplier approval required"],
                ["expiryRetestRequired", "Expiry/retest required"],
                ["quarantineOnReceipt", "Quarantine on receipt"],
                ["blockExpiredMaterials", "Block expired materials"],
                ["blockRejectedLots", "Block rejected lots"],
              ]}
              onSave={() => updateMaterialSettings.mutate({ values: materialSettings, metadata: criticalMetadata() })}
              saving={updateMaterialSettings.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="CAPA / Deviation / NCR Settings"
              icon={<AlertTriangle className="h-5 w-5" />}
              values={qualityEvents}
              onChange={setQualityEvents}
              fields={[
                ["capaClosureRequiresQaApproval", "CAPA closure requires QA approval"],
                ["deviationClosureRequiresQaApproval", "Deviation closure requires QA approval"],
                ["ncrDispositionRequiresApproval", "NCR disposition requires approval"],
                ["effectivenessCheckRequired", "Effectiveness check required"],
                ["rootCauseRequired", "Root cause required"],
              ]}
              onSave={() => updateQualityEvents.mutate({ values: qualityEvents, metadata: criticalMetadata() })}
              saving={updateQualityEvents.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="OOS/OOT & Complaint Settings"
              icon={<Bell className="h-5 w-5" />}
              values={oosComplaint}
              onChange={setOosComplaint}
              fields={[
                ["oosQaReviewRequired", "OOS QA review required"],
                ["ootHandledAsOos", "OOT handled as OOS"],
                ["complaintInvestigationRequired", "Complaint investigation required"],
                ["complaintClosureRequiresApproval", "Complaint closure requires approval"],
              ]}
              onSave={() => updateOosComplaint.mutate({ values: oosComplaint, metadata: criticalMetadata() })}
              saving={updateOosComplaint.isPending}
              saveDisabled={!canSaveCritical}
            />
            <ControlCard
              title="Change Control Settings"
              icon={<GitBranch className="h-5 w-5" />}
              values={changeControlSettings}
              onChange={setChangeControlSettings}
              fields={[
                ["impactAssessmentRequired", "Impact assessment required"],
                ["qaApprovalRequired", "QA approval required"],
                ["implementationEvidenceRequired", "Implementation evidence required"],
                ["effectivenessReviewRequired", "Effectiveness review required"],
              ]}
              onSave={() => updateChangeControlSettings.mutate({ values: changeControlSettings, metadata: criticalMetadata() })}
              saving={updateChangeControlSettings.isPending}
              saveDisabled={!canSaveCritical}
            />
          </div>
        </div>
      )}

      {active === "signatures" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              E-Signature Settings
            </CardTitle>
            <CardDescription>Configure where electronic signatures are expected. Signature events still require secure backend authentication.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="E-signature enabled" checked={booleanValue(esignature.esignatureEnabled, true)} onChange={(checked) => setEsignature((prev) => ({ ...prev, esignatureEnabled: checked }))} />
              <ToggleRow label="Require password re-authentication" checked={booleanValue(esignature.passwordReauthenticationRequired, true)} onChange={(checked) => setEsignature((prev) => ({ ...prev, passwordReauthenticationRequired: checked }))} />
              <ToggleRow label="Signature history enabled" checked={booleanValue(esignature.signatureHistoryEnabled, true)} onChange={(checked) => setEsignature((prev) => ({ ...prev, signatureHistoryEnabled: checked }))} />
            </div>
            <Field label="Signature statement template">
              <Textarea value={textValue(esignature.signatureStatementTemplate)} onChange={(event) => setEsignature((prev) => ({ ...prev, signatureStatementTemplate: event.target.value }))} />
            </Field>
            <Field label="Require e-signature for">
              <Textarea
                value={arrayValue<string>(esignature.requiredFor).join("\n")}
                onChange={(event) => setEsignature((prev) => ({ ...prev, requiredFor: linesToArray(event.target.value) }))}
              />
            </Field>
            <Button onClick={() => updateEsignature.mutate({ values: esignature, metadata: criticalMetadata() })} disabled={updateEsignature.isPending || !canSaveCritical}>
              <Save className="h-4 w-4" />
              {updateEsignature.isPending ? "Saving..." : "Save e-signature settings"}
            </Button>
          </CardContent>
        </Card>
      )}

      {active === "integrations-review" && (
        <div className="space-y-4">
          <ChangeControlPanel reason={changeReason} effectiveDate={effectiveDate} impact={changeImpact} onReason={setChangeReason} onEffectiveDate={setEffectiveDate} onImpact={setChangeImpact} />
          <div className="grid gap-4 xl:grid-cols-2">
            <ControlCard
              title="Integration Settings"
              icon={<Network className="h-5 w-5" />}
              values={integrations}
              onChange={setIntegrations}
              fields={[
                ["emailEnabled", "Email integration enabled"],
                ["smsEnabled", "SMS integration enabled"],
                ["webhooksEnabled", "Webhooks enabled"],
                ["ssoEnabled", "SSO enabled"],
                ["secretsStoredExternally", "Secrets stored securely outside plain settings"],
              ]}
              onSave={() => updateIntegrations.mutate({ values: integrations, metadata: criticalMetadata() })}
              saving={updateIntegrations.isPending}
              saveDisabled={!canSaveCritical}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Management Review & Quality Objectives
                </CardTitle>
                <CardDescription>Define required review inputs and outputs. Performance analysis stays in Management Review and Reports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Review frequency months">
                  <Input type="number" min={1} value={numberValue(managementReview.reviewFrequencyMonths, 12)} onChange={(event) => setManagementReview((prev) => ({ ...prev, reviewFrequencyMonths: Number(event.target.value) }))} />
                </Field>
                <Field label="Default meeting owner">
                  <Input value={textValue(managementReview.defaultMeetingOwner)} onChange={(event) => setManagementReview((prev) => ({ ...prev, defaultMeetingOwner: event.target.value }))} />
                </Field>
                <Field label="Required inputs">
                  <Textarea value={arrayValue<string>(managementReview.requiredInputs).join("\n")} onChange={(event) => setManagementReview((prev) => ({ ...prev, requiredInputs: linesToArray(event.target.value) }))} />
                </Field>
                <Field label="Required outputs">
                  <Textarea value={arrayValue<string>(managementReview.requiredOutputs).join("\n")} onChange={(event) => setManagementReview((prev) => ({ ...prev, requiredOutputs: linesToArray(event.target.value) }))} />
                </Field>
                <Button onClick={() => updateManagementReview.mutate({ values: managementReview, metadata: criticalMetadata() })} disabled={updateManagementReview.isPending || !canSaveCritical}>
                  <Save className="h-4 w-4" />
                  {updateManagementReview.isPending ? "Saving..." : "Save management review settings"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {active === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications & Escalations
            </CardTitle>
            <CardDescription>Manage organization email wording for common quality events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.isLoading && <LoadingScreen label="Loading notification templates" />}
            {templates.data?.map((template) => (
              <TemplateRow
                key={template.eventType}
                template={template}
                saving={updateTemplate.isPending}
                onSave={(values) => updateTemplate.mutate({ eventType: template.eventType, values })}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {active === "change-requests" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Settings Change Requests
            </CardTitle>
            <CardDescription>Review controlled settings changes before they become effective.</CardDescription>
          </CardHeader>
          <CardContent>
            {changeRequests.isLoading && <LoadingScreen label="Loading settings change requests" />}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-body">
                <thead className="bg-muted/50 text-label uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Effective</th>
                    <th className="px-3 py-2">Requested by</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(changeRequests.data ?? []).map((request) => (
                    <tr key={request.id}>
                      <td className="px-3 py-2">{request.section}</td>
                      <td className="px-3 py-2">
                        <Badge variant={request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "error" : "warning"}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{request.effectiveDate}</td>
                      <td className="px-3 py-2">{request.requestedByName}</td>
                      <td className="px-3 py-2">{request.changeReason}</td>
                      <td className="px-3 py-2">
                        {request.status === "PENDING" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => approveChangeRequest.mutate({ id: request.id, comment: "Approved in organization settings" })}
                              disabled={approveChangeRequest.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => rejectChangeRequest.mutate({ id: request.id, comment: "Rejected in organization settings" })}
                              disabled={rejectChangeRequest.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-label text-muted-foreground">{request.reviewComment ?? "Reviewed"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!changeRequests.isLoading && (changeRequests.data ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                        No settings change requests submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {active === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Settings Change History
            </CardTitle>
            <CardDescription>Every organization settings change is logged server-side.</CardDescription>
          </CardHeader>
          <CardContent>
            {audit.isLoading && <LoadingScreen label="Loading settings change history" />}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-body">
                <thead className="bg-muted/50 text-label uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Effective</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(audit.data ?? []).map((entry, index) => (
                    <tr key={`${entry.timestamp}-${index}`}>
                      <td className="px-3 py-2">{new Date(entry.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">{entry.section}</td>
                      <td className="px-3 py-2"><Badge variant="info">{entry.action}</Badge></td>
                      <td className="px-3 py-2">{entry.effectiveDate ?? "Immediate"}</td>
                      <td className="px-3 py-2">{entry.userFullName}</td>
                      <td className="px-3 py-2">{entry.reason}</td>
                    </tr>
                  ))}
                  {!audit.isLoading && (audit.data ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                        No organization settings changes recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  function updateSite(index: number, patch: Partial<SiteRow>) {
    setSitesSettings((prev) => {
      const sites = arrayValue<SiteRow>(prev.sites).map((site, i) => (i === index ? { ...site, ...patch } : site));
      return { ...prev, sites };
    });
  }

  function removeSite(index: number) {
    setSitesSettings((prev) => ({ ...prev, sites: arrayValue<SiteRow>(prev.sites).filter((_, i) => i !== index) }));
  }

  function addDepartment() {
    setProcessSettings((prev) => ({
      ...prev,
      departments: [
        ...arrayValue<DepartmentRow>(prev.departments),
        { departmentCode: "", departmentName: "", departmentHead: "", qaContact: "", site: "", status: "Active" },
      ],
    }));
  }

  function updateDepartment(index: number, patch: Partial<DepartmentRow>) {
    setProcessSettings((prev) => ({
      ...prev,
      departments: arrayValue<DepartmentRow>(prev.departments).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function removeDepartment(index: number) {
    setProcessSettings((prev) => ({ ...prev, departments: arrayValue<DepartmentRow>(prev.departments).filter((_, i) => i !== index) }));
  }

  function addProcess() {
    setProcessSettings((prev) => ({
      ...prev,
      processes: [
        ...arrayValue<ProcessRow>(prev.processes),
        { processCode: "", processName: "", processOwner: "", department: "", processType: "Core / Operational Process", reviewFrequency: "Annual", critical: true, status: "Active" },
      ],
    }));
  }

  function updateProcess(index: number, patch: Partial<ProcessRow>) {
    setProcessSettings((prev) => ({
      ...prev,
      processes: arrayValue<ProcessRow>(prev.processes).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function removeProcess(index: number) {
    setProcessSettings((prev) => ({ ...prev, processes: arrayValue<ProcessRow>(prev.processes).filter((_, i) => i !== index) }));
  }

  function addApprovalRule() {
    setApprovalSettings((prev) => ({
      ...prev,
      rules: [
        ...arrayValue<ApprovalRule>(prev.rules),
        {
          module: "Documents",
          recordType: "Any",
          riskLevel: "Any",
          department: "",
          requiredReviewerRole: "QA Reviewer",
          requiredApproverRole: "QA Manager",
          approvalLevels: 1,
          approvalMode: "Sequential",
          selfApprovalAllowed: false,
          esignatureRequired: true,
          commentsRequired: true,
          effectiveDate,
          status: "Draft",
        },
      ],
    }));
  }

  function updateApprovalRule(index: number, patch: Partial<ApprovalRule>) {
    setApprovalSettings((prev) => ({
      ...prev,
      rules: arrayValue<ApprovalRule>(prev.rules).map((row, i) => (i === index ? { ...row, ...patch, selfApprovalAllowed: false } : row)),
    }));
  }

  function removeApprovalRule(index: number) {
    setApprovalSettings((prev) => ({ ...prev, rules: arrayValue<ApprovalRule>(prev.rules).filter((_, i) => i !== index) }));
  }

  function updateThreshold(index: number, patch: Partial<ThresholdRow>) {
    setRisk((prev) => ({
      ...prev,
      thresholds: arrayValue<ThresholdRow>(prev.thresholds).map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function removeThreshold(index: number) {
    setRisk((prev) => ({ ...prev, thresholds: arrayValue<ThresholdRow>(prev.thresholds).filter((_, i) => i !== index) }));
  }
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  badge?: "success" | "warning" | "error" | "neutral";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {badge ? <Badge variant={badge}>{value}</Badge> : <p className="truncate text-body font-medium">{value}</p>}
        <p className="text-label text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ConfigRowsCard({
  title,
  description,
  icon,
  children,
  onAdd,
  onSave,
  saving,
  saveDisabled,
  secondaryAddLabel,
  onSecondaryAdd,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  onAdd: () => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
  secondaryAddLabel?: string;
  onSecondaryAdd?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
            {secondaryAddLabel && onSecondaryAdd && (
              <Button variant="outline" onClick={onSecondaryAdd}>
                <Plus className="h-4 w-4" />
                {secondaryAddLabel}
              </Button>
            )}
            <Button onClick={onSave} disabled={saving || saveDisabled}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} aria-label={label}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-body text-muted-foreground">{text}</p>;
}

function NumberingRow({
  scheme,
  saving,
  onSave,
}: {
  scheme: NumberingScheme;
  saving: boolean;
  onSave: (values: Partial<NumberingScheme>) => void;
}) {
  const [draft, setDraft] = useState(scheme);

  useEffect(() => setDraft(scheme), [scheme]);

  return (
    <div className="grid gap-3 rounded-md border border-border p-3 xl:grid-cols-[1.2fr_.8fr_1.2fr_.7fr_.8fr_.7fr_.5fr_.8fr_auto]">
      <div>
        <p className="text-body font-medium">{moduleLabel(scheme.moduleCode)}</p>
        <p className="text-label text-muted-foreground">{scheme.example ?? "Example appears after save"}</p>
      </div>
      <Input aria-label={`${scheme.moduleCode} prefix`} value={draft.prefix} onChange={(event) => setDraft((prev) => ({ ...prev, prefix: event.target.value }))} />
      <Input aria-label={`${scheme.moduleCode} format`} value={draft.formatPattern} onChange={(event) => setDraft((prev) => ({ ...prev, formatPattern: event.target.value }))} />
      <Input aria-label={`${scheme.moduleCode} next sequence`} type="number" min={1} value={draft.nextSequence} onChange={(event) => setDraft((prev) => ({ ...prev, nextSequence: Number(event.target.value) }))} />
      <Select aria-label={`${scheme.moduleCode} year format`} value={draft.yearFormat ?? "YYYY"} onChange={(event) => setDraft((prev) => ({ ...prev, yearFormat: event.target.value }))}>
        <option value="YYYY">YYYY</option>
        <option value="YY">YY</option>
        <option value="NONE">None</option>
      </Select>
      <Input aria-label={`${scheme.moduleCode} sequence length`} type="number" min={1} max={10} value={draft.sequenceLength ?? 5} onChange={(event) => setDraft((prev) => ({ ...prev, sequenceLength: Number(event.target.value) }))} />
      <Input aria-label={`${scheme.moduleCode} separator`} value={draft.separator ?? "-"} onChange={(event) => setDraft((prev) => ({ ...prev, separator: event.target.value }))} />
      <Select aria-label={`${scheme.moduleCode} reset frequency`} value={draft.resetFrequency ?? "Yearly"} onChange={(event) => setDraft((prev) => ({ ...prev, resetFrequency: event.target.value, yearlyReset: event.target.value === "Yearly" }))}>
        <option value="Never">Never</option>
        <option value="Yearly">Yearly</option>
        <option value="Monthly">Monthly</option>
      </Select>
      <Button variant="outline" onClick={() => onSave(draft)} disabled={saving}>
        <Save className="h-4 w-4" />
        Save
      </Button>
    </div>
  );
}

function TemplateRow({
  template,
  saving,
  onSave,
}: {
  template: NotificationTemplate;
  saving: boolean;
  onSave: (values: Partial<NotificationTemplate>) => void;
}) {
  const [draft, setDraft] = useState(template);

  useEffect(() => setDraft(template), [template]);

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-medium">{moduleLabel(template.eventType)}</p>
        <Badge variant={draft.enabled ? "success" : "neutral"}>{draft.enabled ? "Enabled" : "Disabled"}</Badge>
        <label className="ml-auto flex items-center gap-2 text-label text-muted-foreground">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))} className="h-4 w-4 rounded border-input text-primary" />
          Enabled
        </label>
      </div>
      <Input aria-label={`${template.eventType} subject`} value={draft.subject} onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))} />
      <Textarea aria-label={`${template.eventType} body`} value={draft.body} onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))} />
      <Button variant="outline" onClick={() => onSave(draft)} disabled={saving}>
        <Save className="h-4 w-4" />
        Save template
      </Button>
    </div>
  );
}

function ControlCard({
  title,
  icon,
  values,
  fields,
  numericFields,
  onChange,
  onSave,
  saving,
  saveDisabled,
}: {
  title: string;
  icon: ReactNode;
  values: Record<string, unknown>;
  fields: Array<[string, string]>;
  numericFields?: Array<[string, string]>;
  onChange: (values: Record<string, unknown>) => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(([key, label]) => (
          <ToggleRow key={key} label={label} checked={booleanValue(values[key])} onChange={(checked) => onChange({ ...values, [key]: checked })} />
        ))}
        {numericFields?.map(([key, label]) => (
          <Field key={key} label={label}>
            <Input type="number" value={numberValue(values[key], 0)} onChange={(event) => onChange({ ...values, [key]: Number(event.target.value) })} />
          </Field>
        ))}
        <Button onClick={onSave} disabled={saving || saveDisabled}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function LocalizationCard({
  values,
  onChange,
  onSave,
  saving,
}: {
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          Localization & Units
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Timezone">
            <Select value={textValue(values.timezone, "UTC")} onChange={(event) => onChange({ ...values, timezone: event.target.value })}>
              <option value="UTC">UTC</option>
              <option value="Africa/Nairobi">Africa/Nairobi</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </Select>
          </Field>
          <Field label="Date format">
            <Select value={textValue(values.dateFormat, "yyyy-MM-dd")} onChange={(event) => onChange({ ...values, dateFormat: event.target.value })}>
              <option value="yyyy-MM-dd">yyyy-MM-dd</option>
              <option value="dd MMM yyyy">dd MMM yyyy</option>
              <option value="MMM d, yyyy">MMM d, yyyy</option>
            </Select>
          </Field>
          <Field label="Weight unit">
            <Input value={textValue(values.weightUnit, "kg")} onChange={(event) => onChange({ ...values, weightUnit: event.target.value })} />
          </Field>
          <Field label="Temperature unit">
            <Input value={textValue(values.temperatureUnit, "C")} onChange={(event) => onChange({ ...values, temperatureUnit: event.target.value })} />
          </Field>
        </div>
        <Button onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
