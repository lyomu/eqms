"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCreateOrganization, usePlatformPlans } from "@/hooks/usePlatformAdmin";

interface FormValues {
  code: string;
  name: string;
  legalName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  country: string;
  timezone: string;
  planCode: string;
}

export default function NewPlatformOrganizationPage() {
  const router = useRouter();
  const plans = usePlatformPlans();
  const create = useCreateOrganization();
  const form = useForm<FormValues>({
    defaultValues: { timezone: "UTC", planCode: "starter" },
  });

  async function onSubmit(values: FormValues) {
    const created = await create.mutateAsync({ ...values });
    router.push(`/platform/organizations/${created.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">New Organization</h1>
        <p className="text-body text-muted-foreground">Create a tenant and initial trial license.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" required {...form.register("code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" {...form.register("legalName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryContactName">Primary contact</Label>
              <Input id="primaryContactName" {...form.register("primaryContactName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryContactEmail">Contact email</Label>
              <Input id="primaryContactEmail" type="email" {...form.register("primaryContactEmail")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register("country")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" {...form.register("timezone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planCode">Plan</Label>
              <Select id="planCode" {...form.register("planCode")}>
                {(plans.data ?? []).map((plan) => (
                  <option key={plan.code} value={plan.code}>{plan.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => router.push("/platform/organizations")}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
