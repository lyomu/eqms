"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Ban, CheckCircle2, Power, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Select } from "@/components/ui/select";
import { useOrganizationAction, usePlatformOrganization, usePlatformPlans } from "@/hooks/usePlatformAdmin";

const checklist = [
  "company profile",
  "sites",
  "departments",
  "users",
  "roles",
  "approval matrix",
  "document categories",
  "material categories",
  "supplier register",
  "product master",
];

export default function PlatformOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const org = usePlatformOrganization(id);
  const plans = usePlatformPlans();
  const action = useOrganizationAction(id);
  const [planCode, setPlanCode] = useState("enterprise");

  if (org.isLoading) return <LoadingScreen label="Loading organization" />;
  if (org.isError || !org.data) {
    return <ErrorAlert title="Unable to load organization" message="Check your platform admin permissions." />;
  }

  const data = org.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">{data.name}</h1>
          <p className="text-body text-muted-foreground">{data.code} · {data.primaryContactEmail ?? "No contact email"}</p>
        </div>
        <Badge variant={data.status === "active" ? "success" : data.status === "suspended" ? "error" : "warning"}>
          {data.status}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => action.mutate({ action: "reactivate" })}>
            <RotateCcw className="h-4 w-4" />
            Reactivate
          </Button>
          <Button variant="destructive" onClick={() => action.mutate({ action: "suspend" })}>
            <Ban className="h-4 w-4" />
            Suspend
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Plan and license status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Plan</span><span className="font-medium">{data.planName ?? "Unassigned"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Expires</span><span className="font-medium">{data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : "No expiry"}</span></div>
            <div className="flex items-center gap-2">
              <Select value={planCode} onChange={(event) => setPlanCode(event.target.value)}>
                {(plans.data ?? []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
              </Select>
              <Button onClick={() => action.mutate({ action: "change-plan", body: { planCode } })}>Change</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>User and site license limits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-label"><span>Users</span><span>{data.userCount ?? 0}{data.userLimit ? ` / ${data.userLimit}` : ""}</span></div>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-brand-secondary" style={{ width: `${data.userLimit ? Math.min(100, ((data.userCount ?? 0) / data.userLimit) * 100) : 100}%` }} />
              </div>
            </div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Sites</span><span className="font-medium">{data.siteLimit ?? "Unlimited"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
            <CardDescription>Organization onboarding readiness.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item} className="flex items-center gap-2 text-body">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Access</CardTitle>
          <CardDescription>Enable or disable licensed eQMS modules for this organization.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data.modules ?? []).map((module) => (
            <div key={module.code} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
              <div>
                <p className="text-body font-medium">{module.name}</p>
                <p className="text-label text-muted-foreground">{module.code}</p>
              </div>
              <Button
                variant={module.enabled ? "outline" : "default"}
                size="sm"
                onClick={() => action.mutate({
                  action: module.enabled ? "disable-module" : "enable-module",
                  body: { moduleCode: module.code },
                })}
              >
                <Power className="h-4 w-4" />
                {module.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
