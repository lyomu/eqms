"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { SUPPLIER_TYPE_LABELS, type SupplierType } from "@/types/supplier";

export default function NewSupplierPage() {
  const router = useRouter();
  const create = useCreateSupplier();
  const [supplierType, setSupplierType] = useState<SupplierType>("RAW_MATERIAL");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const supplier = await create.mutateAsync({
        supplierName: String(form.get("supplierName") ?? ""),
        supplierType,
        contactPerson: String(form.get("contactPerson") ?? "") || undefined,
        email: String(form.get("email") ?? "") || undefined,
        phone: String(form.get("phone") ?? "") || undefined,
        location: String(form.get("location") ?? ""),
      });
      toast.success("Supplier created");
      router.push(`/suppliers/${supplier.id}`);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not create supplier.");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-h1 text-brand-primary">Create Supplier</h1>
        <p className="text-body text-muted-foreground">Supplier code is generated after creation.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Supplier Details</CardTitle></CardHeader>
        <CardContent>
          {error && <div className="mb-4"><ErrorAlert title="Couldn't create supplier" message={error} /></div>}
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Supplier Code</Label><Input value="Auto-generated" disabled /></div>
            <div className="space-y-1.5"><Label htmlFor="supplierName">Name *</Label><Input id="supplierName" name="supplierName" required /></div>
            <div className="space-y-1.5"><Label htmlFor="supplierType">Type *</Label><Select id="supplierType" value={supplierType} onChange={(e) => setSupplierType(e.target.value as SupplierType)}>{Object.entries(SUPPLIER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
            <div className="space-y-1.5"><Label htmlFor="contactPerson">Contact Person</Label><Input id="contactPerson" name="contactPerson" /></div>
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
            <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="location">Location *</Label><Input id="location" name="location" required /></div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button>
              <Button type="button" variant="outline" onClick={() => router.push("/suppliers")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
