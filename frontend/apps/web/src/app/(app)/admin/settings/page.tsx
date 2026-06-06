"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hash,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminSettingsAuditLog,
  useAdminSettingsSummary,
  useNotificationTemplates,
  useNumberingSchemes,
  useUpdateNotificationTemplate,
  useUpdateNumberingScheme,
  useUpdateSettingsSection,
} from "@/hooks/useAdminSettings";
import type { NotificationTemplate, NumberingScheme } from "@/lib/admin/settings";
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

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "profile", label: "Profile" },
  { key: "onboarding", label: "Onboarding" },
  { key: "security", label: "Security" },
  { key: "numbering", label: "Numbering" },
  { key: "notifications", label: "Notifications" },
  { key: "audit", label: "Audit Trail" },
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

function statusVariant(status?: string | null): "success" | "warning" | "error" | "neutral" {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "active" || normalized === "trialing") return "success";
  if (normalized === "past_due" || normalized === "expired") return "warning";
  if (normalized === "suspended" || normalized === "cancelled") return "error";
  return "neutral";
}

function moduleLabel(code: string) {
  return code
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function OrganizationAdminSettingsPage() {
  const { currentUser } = useAuth();
  const [active, setActive] = useState("overview");
  const summary = useAdminSettingsSummary();
  const numbering = useNumberingSchemes();
  const templates = useNotificationTemplates();
  const audit = useAdminSettingsAuditLog();

  const [general, setGeneral] = useState<Record<string, unknown>>({});
  const [onboarding, setOnboarding] = useState<Record<string, unknown>>({});
  const [security, setSecurity] = useState<Record<string, unknown>>({});
  const updateGeneral = useUpdateSettingsSection("general");
  const updateOnboarding = useUpdateSettingsSection("onboarding");
  const updateSecurity = useUpdateSettingsSection("security");
  const updateNumbering = useUpdateNumberingScheme();
  const updateTemplate = useUpdateNotificationTemplate();

  useEffect(() => {
    if (summary.data?.general) setGeneral(summary.data.general);
    if (summary.data?.onboarding) setOnboarding(summary.data.onboarding);
    if (summary.data?.security) setSecurity(summary.data.security);
  }, [summary.data]);

  const onboardingProgress = useMemo(() => {
    const completed = checklistItems.filter(([key]) => booleanValue(onboarding[key])).length;
    return Math.round((completed / checklistItems.length) * 100);
  }, [onboarding]);

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
        message="The organization admin settings could not be loaded. Refresh the session and try again."
      />
    );
  }

  const license = summary.data?.license;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">Organization Admin</h1>
          <p className="text-body text-muted-foreground">
            Configure tenant-wide controls for your organization dashboard.
          </p>
        </div>
        <Badge variant="info" className="ml-auto">
          Tenant scoped
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-body font-medium">
              {license?.organizationName ?? textValue(general.companyName, "Organization")}
            </p>
            <p className="text-label text-muted-foreground">ID {license?.organizationId ?? currentUser?.organizationId}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              License
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant={statusVariant(license?.licenseStatus)}>
              {license?.licenseStatus ?? "Unknown"}
            </Badge>
            <p className="text-label text-muted-foreground">{license?.planName ?? "No plan assigned"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-success" style={{ width: `${onboardingProgress}%` }} />
            </div>
            <p className="mt-2 text-label text-muted-foreground">{onboardingProgress}% complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body font-medium">
              {license?.userCount ?? 0}
              {license?.userLimit ? ` / ${license.userLimit}` : ""}
            </p>
            <p className="text-label text-muted-foreground">Licensed seats</p>
          </CardContent>
        </Card>
      </div>

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      {active === "overview" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>License Status</CardTitle>
              <CardDescription>
                Platform-managed subscription details are read-only for organization admins.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-label text-muted-foreground">Organization status</p>
                <Badge variant={statusVariant(license?.status)}>{license?.status ?? "Unknown"}</Badge>
              </div>
              <div>
                <p className="text-label text-muted-foreground">License status</p>
                <Badge variant={statusVariant(license?.licenseStatus)}>{license?.licenseStatus ?? "Unknown"}</Badge>
              </div>
              <div>
                <p className="text-label text-muted-foreground">Plan</p>
                <p className="text-body font-medium">{license?.planName ?? "Unassigned"}</p>
              </div>
              <div>
                <p className="text-label text-muted-foreground">Expires</p>
                <p className="text-body font-medium">
                  {license?.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Setup Tasks</CardTitle>
              <CardDescription>
                Track organization readiness for regulated use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklistItems.slice(0, 6).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-body">{label}</span>
                  <Badge variant={booleanValue(onboarding[key]) ? "success" : "neutral"}>
                    {booleanValue(onboarding[key]) ? "Done" : "Open"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {active === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Profile
            </CardTitle>
            <CardDescription>
              These defaults are tenant-scoped and never accept an organization ID from the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company name">
                <Input
                  value={textValue(general.companyName)}
                  onChange={(event) => setGeneral((prev) => ({ ...prev, companyName: event.target.value }))}
                />
              </Field>
              <Field label="Support email">
                <Input
                  type="email"
                  value={textValue(general.supportEmail)}
                  onChange={(event) => setGeneral((prev) => ({ ...prev, supportEmail: event.target.value }))}
                />
              </Field>
              <Field label="Support phone">
                <Input
                  value={textValue(general.supportPhone)}
                  onChange={(event) => setGeneral((prev) => ({ ...prev, supportPhone: event.target.value }))}
                />
              </Field>
              <Field label="Country">
                <Input
                  value={textValue(general.country)}
                  onChange={(event) => setGeneral((prev) => ({ ...prev, country: event.target.value }))}
                />
              </Field>
              <Field label="Timezone">
                <Select
                  value={textValue(general.timezone, "UTC")}
                  onChange={(event) => setGeneral((prev) => ({ ...prev, timezone: event.target.value }))}
                >
                  <option value="UTC">UTC</option>
                  <option value="Africa/Nairobi">Africa/Nairobi</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </Select>
              </Field>
              <Field label="Language">
                <Select
                  value={textValue(general.language, "en")}
                  onChange={(event) => setGeneral((prev) => ({ ...prev, language: event.target.value }))}
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </Select>
              </Field>
            </div>
            <Button onClick={() => updateGeneral.mutate(general)} disabled={updateGeneral.isPending}>
              <Save className="h-4 w-4" />
              {updateGeneral.isPending ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>
      )}

      {active === "onboarding" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Organization Setup Checklist
            </CardTitle>
            <CardDescription>
              Mark the operational setup items that are ready for daily use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {checklistItems.map(([key, label]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={booleanValue(onboarding[key])}
                  onChange={(checked) => setOnboarding((prev) => ({ ...prev, [key]: checked }))}
                />
              ))}
            </div>
            <Button onClick={() => updateOnboarding.mutate(onboarding)} disabled={updateOnboarding.isPending}>
              <Save className="h-4 w-4" />
              {updateOnboarding.isPending ? "Saving..." : "Save checklist"}
            </Button>
          </CardContent>
        </Card>
      )}

      {active === "security" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Security Controls
            </CardTitle>
            <CardDescription>
              These are organization policy settings. Backend authorization still enforces access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleRow
                label="Require MFA"
                checked={booleanValue(security.mfaRequired, true)}
                onChange={(checked) => setSecurity((prev) => ({ ...prev, mfaRequired: checked }))}
              />
              <ToggleRow
                label="Require MFA for signatures"
                checked={booleanValue(security.mfaRequiredForSignatures, true)}
                onChange={(checked) => setSecurity((prev) => ({ ...prev, mfaRequiredForSignatures: checked }))}
              />
              <Field label="Password minimum length">
                <Input
                  type="number"
                  min={8}
                  value={numberValue(security.passwordMinimumLength, 12)}
                  onChange={(event) =>
                    setSecurity((prev) => ({ ...prev, passwordMinimumLength: Number(event.target.value) }))
                  }
                />
              </Field>
              <Field label="Password expiry days">
                <Input
                  type="number"
                  min={1}
                  value={numberValue(security.passwordExpiryDays, 90)}
                  onChange={(event) =>
                    setSecurity((prev) => ({ ...prev, passwordExpiryDays: Number(event.target.value) }))
                  }
                />
              </Field>
              <Field label="Session timeout minutes">
                <Input
                  type="number"
                  min={5}
                  value={numberValue(security.sessionTimeoutMinutes, 30)}
                  onChange={(event) =>
                    setSecurity((prev) => ({ ...prev, sessionTimeoutMinutes: Number(event.target.value) }))
                  }
                />
              </Field>
              <Field label="Lockout attempts">
                <Input
                  type="number"
                  min={1}
                  value={numberValue(security.accountLockoutAttempts, 5)}
                  onChange={(event) =>
                    setSecurity((prev) => ({ ...prev, accountLockoutAttempts: Number(event.target.value) }))
                  }
                />
              </Field>
            </div>
            <Button onClick={() => updateSecurity.mutate(security)} disabled={updateSecurity.isPending}>
              <Save className="h-4 w-4" />
              {updateSecurity.isPending ? "Saving..." : "Save security"}
            </Button>
          </CardContent>
        </Card>
      )}

      {active === "numbering" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Numbering Schemes
            </CardTitle>
            <CardDescription>
              Configure tenant-specific record numbers by module.
            </CardDescription>
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

      {active === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Templates
            </CardTitle>
            <CardDescription>
              Manage organization email wording for common quality events.
            </CardDescription>
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

      {active === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Settings Audit Trail
            </CardTitle>
            <CardDescription>
              Every organization settings change is logged server-side.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {audit.isLoading && <LoadingScreen label="Loading settings audit trail" />}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-body">
                <thead className="bg-muted/50 text-label uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">Section</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(audit.data ?? []).map((entry, index) => (
                    <tr key={`${entry.timestamp}-${index}`}>
                      <td className="px-3 py-2">{new Date(entry.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">{entry.section}</td>
                      <td className="px-3 py-2">
                        <Badge variant="info">{entry.action}</Badge>
                      </td>
                      <td className="px-3 py-2">{entry.userFullName}</td>
                      <td className="px-3 py-2">{entry.reason}</td>
                    </tr>
                  ))}
                  {!audit.isLoading && (audit.data ?? []).length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
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
    <div className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1.2fr_1fr_1.4fr_1fr_auto]">
      <div>
        <p className="text-body font-medium">{moduleLabel(scheme.moduleCode)}</p>
        <p className="text-label text-muted-foreground">{scheme.example ?? "Example appears after save"}</p>
      </div>
      <Input
        aria-label={`${scheme.moduleCode} prefix`}
        value={draft.prefix}
        onChange={(event) => setDraft((prev) => ({ ...prev, prefix: event.target.value }))}
      />
      <Input
        aria-label={`${scheme.moduleCode} format`}
        value={draft.formatPattern}
        onChange={(event) => setDraft((prev) => ({ ...prev, formatPattern: event.target.value }))}
      />
      <Input
        aria-label={`${scheme.moduleCode} next sequence`}
        type="number"
        min={1}
        value={draft.nextSequence}
        onChange={(event) => setDraft((prev) => ({ ...prev, nextSequence: Number(event.target.value) }))}
      />
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
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
            className="h-4 w-4 rounded border-input text-primary"
          />
          Enabled
        </label>
      </div>
      <Input
        aria-label={`${template.eventType} subject`}
        value={draft.subject}
        onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
      />
      <Textarea
        aria-label={`${template.eventType} body`}
        value={draft.body}
        onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
      />
      <Button variant="outline" onClick={() => onSave(draft)} disabled={saving}>
        <Save className="h-4 w-4" />
        Save template
      </Button>
    </div>
  );
}
