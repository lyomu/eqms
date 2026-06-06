"use client";

import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { useCreatePlan, usePlatformPlans } from "@/hooks/usePlatformAdmin";

interface PlanForm {
  code: string;
  name: string;
  description: string;
  userLimit?: number;
  siteLimit?: number;
}

export default function PlatformPlansPage() {
  const plans = usePlatformPlans();
  const create = useCreatePlan();
  const form = useForm<PlanForm>();

  function submit(values: PlanForm) {
    create.mutate({ ...values, custom: true });
    form.reset();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">Plans</h1>
        <p className="text-body text-muted-foreground">Manage plan catalog and user/site limits.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardContent className="p-0">
            {plans.isLoading ? <LoadingScreen label="Loading plans" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-body">
                  <thead className="bg-muted/40 text-left text-label uppercase text-muted-foreground">
                    <tr><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Limits</th><th className="px-4 py-3">Modules</th><th className="px-4 py-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(plans.data ?? []).map((plan) => (
                      <tr key={plan.id}>
                        <td className="px-4 py-3"><p className="font-medium">{plan.name}</p><p className="text-label text-muted-foreground">{plan.code}</p></td>
                        <td className="px-4 py-3">Users {plan.userLimit ?? "Unlimited"} · Sites {plan.siteLimit ?? "Unlimited"}</td>
                        <td className="px-4 py-3">{plan.moduleCount ?? 0}</td>
                        <td className="px-4 py-3"><Badge variant={plan.active ? "success" : "neutral"}>{plan.active ? "Active" : "Inactive"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Create Custom Plan</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
              <div className="space-y-2"><Label htmlFor="code">Code</Label><Input id="code" required {...form.register("code")} /></div>
              <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" required {...form.register("name")} /></div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Input id="description" {...form.register("description")} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label htmlFor="userLimit">Users</Label><Input id="userLimit" type="number" {...form.register("userLimit", { valueAsNumber: true })} /></div>
                <div className="space-y-2"><Label htmlFor="siteLimit">Sites</Label><Input id="siteLimit" type="number" {...form.register("siteLimit", { valueAsNumber: true })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}><Plus className="h-4 w-4" />Create plan</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
