"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { ErrorAlert } from "@/components/ui/error-alert";
import { usePlatformOrganizations } from "@/hooks/usePlatformAdmin";

const statusVariant: Record<string, "success" | "warning" | "error" | "neutral" | "info"> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  expired: "warning",
  suspended: "error",
  cancelled: "neutral",
};

export default function PlatformOrganizationsPage() {
  const organizations = usePlatformOrganizations();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-h1 text-brand-primary">Organizations</h1>
          <p className="text-body text-muted-foreground">Platform tenant, subscription, and license management.</p>
        </div>
        <Button asChild className="ml-auto">
          <Link href="/platform/organizations/new">
            <Plus className="h-4 w-4" />
            New organization
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {organizations.isLoading ? (
            <LoadingScreen label="Loading organizations" />
          ) : organizations.isError ? (
            <div className="p-4">
              <ErrorAlert title="Unable to load organizations" message="Check your platform admin permissions." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-body">
                <thead className="bg-muted/40 text-left text-label uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Users</th>
                    <th className="px-4 py-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {(organizations.data ?? []).map((org) => (
                    <tr key={org.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <Link href={`/platform/organizations/${org.id}`} className="flex items-center gap-2 font-medium text-brand-primary hover:underline">
                          <Building2 className="h-4 w-4" />
                          <span>{org.name}</span>
                        </Link>
                        <p className="text-label text-muted-foreground">{org.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[org.status] ?? "neutral"}>{org.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{org.planName ?? "Unassigned"}</td>
                      <td className="px-4 py-3">
                        {org.userCount ?? 0}
                        {org.userLimit ? ` / ${org.userLimit}` : ""}
                      </td>
                      <td className="px-4 py-3">{org.primaryContactEmail ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
