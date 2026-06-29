"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  KeyRound,
  LogOut,
  Network,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/stores/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DefaultLandingPage =
  | "/"
  | "/documents"
  | "/capa"
  | "/training"
  | "/suppliers"
  | "/reports";

type DateFormat = "MMM d, yyyy" | "yyyy-MM-dd" | "dd MMM yyyy";
type TableDensity = "comfortable" | "compact";

interface SettingsPreferences {
  defaultLandingPage: DefaultLandingPage;
  tableDensity: TableDensity;
  dateFormat: DateFormat;
  reduceMotion: boolean;
}

const STORAGE_KEY = "eqms.settings.preferences";

const DEFAULT_PREFERENCES: SettingsPreferences = {
  defaultLandingPage: "/",
  tableDensity: "comfortable",
  dateFormat: "MMM d, yyyy",
  reduceMotion: false,
};

const landingPages: Array<{ value: DefaultLandingPage; label: string }> = [
  { value: "/", label: "Dashboard" },
  { value: "/documents", label: "Documents" },
  { value: "/capa", label: "CAPA" },
  { value: "/training", label: "Training" },
  { value: "/suppliers", label: "Suppliers" },
  { value: "/reports", label: "Reports" },
];

function readPreferences(): SettingsPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function roleLabel(authority: string) {
  return authority
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isOrgAdmin(authorities?: string[]) {
  return (authorities ?? []).some((authority) => authority === "ROLE_ADMIN" || authority === "ADMIN");
}

function settingSummary(label: string, value: string, icon: React.ReactNode) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-label text-muted-foreground">{label}</p>
        <p className="truncate text-body font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { currentUser, refetchMe, logout } = useAuth();
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const [preferences, setPreferences] = useState<SettingsPreferences>(DEFAULT_PREFERENCES);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  const topAuthorities = useMemo(
    () => currentUser?.authorities.slice(0, 8) ?? [],
    [currentUser?.authorities]
  );

  function updatePreference<K extends keyof SettingsPreferences>(
    key: K,
    value: SettingsPreferences[K]
  ) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  function savePreferences() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    toast.success("Settings saved for this browser.");
  }

  async function refreshSession() {
    await refetchMe();
    toast.success("Session refreshed.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">Settings</h1>
          <p className="text-body text-muted-foreground">
            Manage your account view, session, and local workspace preferences.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={refreshSession}>
            <RefreshCw className="h-4 w-4" />
            Refresh session
          </Button>
          <Button onClick={savePreferences}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {settingSummary(
          "Signed in as",
          currentUser?.fullName ?? "Account",
          <User className="h-5 w-5" aria-hidden="true" />
        )}
        {settingSummary(
          "Authorities",
          `${currentUser?.authorities.length ?? 0} granted`,
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        )}
        {settingSummary(
          "Workspace",
          sidebarCollapsed ? "Compact sidebar" : "Expanded sidebar",
          <SettingsIcon className="h-5 w-5" aria-hidden="true" />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="space-y-4">
          {isOrgAdmin(currentUser?.authorities) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                  Organization Settings
                </CardTitle>
                <CardDescription>
                  Tenant-wide QMS configuration, approvals, numbering, and audit-ready controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/settings/organization">
                    <Building2 className="h-4 w-4" />
                    Open organization settings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="mt-2 w-full justify-start">
                  <Link href="/settings/processes">
                    <Network className="h-4 w-4" />
                    Open process register
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" aria-hidden="true" />
                Account
              </CardTitle>
              <CardDescription>
                Identity is managed by the authenticated backend session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-label text-muted-foreground">Name</dt>
                  <dd className="mt-1 text-body font-medium">{currentUser?.fullName ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Email</dt>
                  <dd className="mt-1 text-body font-medium">{currentUser?.email ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">User ID</dt>
                  <dd className="mt-1 text-body font-medium">{currentUser?.id ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Session status</dt>
                  <dd className="mt-1">
                    <Badge variant="success">Active</Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                Workspace Preferences
              </CardTitle>
              <CardDescription>
                Saved locally for this browser and applied to your dashboard experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultLandingPage">Default landing page</Label>
                  <Select
                    id="defaultLandingPage"
                    value={preferences.defaultLandingPage}
                    onChange={(event) =>
                      updatePreference("defaultLandingPage", event.target.value as DefaultLandingPage)
                    }
                  >
                    {landingPages.map((page) => (
                      <option key={page.value} value={page.value}>
                        {page.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date format</Label>
                  <Select
                    id="dateFormat"
                    value={preferences.dateFormat}
                    onChange={(event) => updatePreference("dateFormat", event.target.value as DateFormat)}
                  >
                    <option value="MMM d, yyyy">Jun 6, 2026</option>
                    <option value="yyyy-MM-dd">2026-06-06</option>
                    <option value="dd MMM yyyy">06 Jun 2026</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tableDensity">Table density</Label>
                  <Select
                    id="tableDensity"
                    value={preferences.tableDensity}
                    onChange={(event) =>
                      updatePreference("tableDensity", event.target.value as TableDensity)
                    }
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </Select>
                </div>

                <label className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
                  <input
                    type="checkbox"
                    checked={sidebarCollapsed}
                    onChange={(event) => setSidebarCollapsed(event.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary"
                  />
                  <span className="text-body">Use compact sidebar</span>
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
                <input
                  type="checkbox"
                  checked={preferences.reduceMotion}
                  onChange={(event) => updatePreference("reduceMotion", event.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                <span className="text-body">Prefer reduced motion in local UI</span>
              </label>

              {savedAt && (
                <p className="text-label text-muted-foreground">Last saved at {savedAt}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Security
              </CardTitle>
              <CardDescription>
                Session-based controls for your current account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/mfa">
                  <KeyRound className="h-4 w-4" />
                  Manage MFA enrollment
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={refreshSession}
              >
                <RefreshCw className="h-4 w-4" />
                Re-check session
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut className="h-4 w-4" />
                {logout.isPending ? "Signing out..." : "Sign out"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authorities</CardTitle>
              <CardDescription>
                Backend permissions visible to the frontend for navigation context.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topAuthorities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topAuthorities.map((authority) => (
                    <Badge key={authority} variant="info">
                      {roleLabel(authority)}
                    </Badge>
                  ))}
                  {(currentUser?.authorities.length ?? 0) > topAuthorities.length && (
                    <Badge variant="neutral">
                      +{(currentUser?.authorities.length ?? 0) - topAuthorities.length} more
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">No authorities loaded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System</CardTitle>
              <CardDescription>
                Current browser and runtime preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-body">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">API session</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Table density</span>
                <span className={cn("font-medium", preferences.tableDensity === "compact" && "text-brand-primary")}>
                  {preferences.tableDensity === "compact" ? "Compact" : "Comfortable"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Date format</span>
                <span className="font-medium">{preferences.dateFormat}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
