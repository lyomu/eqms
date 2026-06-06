"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNonConformance } from "@/hooks/useNonConformances";
import { NC_TYPE_LABELS, type NcType } from "@/types/nonconformance";

export default function NewNonConformancePage() {
  const router = useRouter();
  const create = useCreateNonConformance();
  const [type, setType] = useState<NcType>("MATERIAL");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nc = await create.mutateAsync({ title: String(f.get("title")), description: String(f.get("description")), ncType: type, affectedItemType: String(f.get("affectedItemType") || type), discoveredBy: String(f.get("discoveredBy") || "Current user") });
    toast.success("Non-conformance created");
    router.push(`/non-conformances/${nc.id}`);
  }
  return <div className="max-w-3xl space-y-4"><h1 className="text-h1 text-brand-primary">Create Non-Conformance</h1><Card><CardHeader><CardTitle>NC Details</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="title">Title *</Label><Input id="title" name="title" required /></div><div className="space-y-1.5"><Label htmlFor="description">Description *</Label><Textarea id="description" name="description" required rows={4} /></div><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div className="space-y-1.5"><Label htmlFor="ncType">NC type</Label><Select id="ncType" value={type} onChange={(e) => setType(e.target.value as NcType)}>{Object.entries(NC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div><div className="space-y-1.5"><Label htmlFor="affectedItemType">Affected item</Label><Input id="affectedItemType" name="affectedItemType" /></div><div className="space-y-1.5"><Label htmlFor="discoveredBy">Discovered by</Label><Input id="discoveredBy" name="discoveredBy" /></div></div><div className="flex gap-2"><Button disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button><Button type="button" variant="outline" onClick={() => router.push("/non-conformances")}>Cancel</Button></div></form></CardContent></Card></div>;
}
