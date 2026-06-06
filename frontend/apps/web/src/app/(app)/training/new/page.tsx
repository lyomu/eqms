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
import { ErrorAlert } from "@/components/ui/error-alert";
import { useCreateTraining } from "@/hooks/useTraining";
import { AUDIENCE_LABELS, FREQUENCY_LABELS, type TrainingAudience, type TrainingFrequency } from "@/types/training";

export default function NewTrainingPage() {
  const router = useRouter();
  const create = useCreateTraining();
  const [audience, setAudience] = useState<TrainingAudience>("ALL");
  const [frequency, setFrequency] = useState<TrainingFrequency>("ANNUAL");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    try {
      const training = await create.mutateAsync({
        title: String(form.get("title") ?? ""),
        content: String(form.get("content") ?? ""),
        intendedAudience: audience,
        requiredFrequency: frequency,
      });
      toast.success("Training program created");
      router.push(`/training/${training.id}`);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not create training.");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-h1 text-brand-primary">Create Training Program</h1>
      <Card>
        <CardHeader><CardTitle>Program Details</CardTitle></CardHeader>
        <CardContent>
          {error && <div className="mb-4"><ErrorAlert title="Couldn't create training" message={error} /></div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="title">Title *</Label><Input id="title" name="title" required /></div>
            <div className="space-y-1.5"><Label htmlFor="content">Content / Description *</Label><Textarea id="content" name="content" rows={6} required /></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="intendedAudience">Intended Audience</Label><Select id="intendedAudience" value={audience} onChange={(e) => setAudience(e.target.value as TrainingAudience)}>{Object.entries(AUDIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
              <div className="space-y-1.5"><Label htmlFor="requiredFrequency">Required Frequency</Label><Select id="requiredFrequency" value={frequency} onChange={(e) => setFrequency(e.target.value as TrainingFrequency)}>{Object.entries(FREQUENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></div>
            </div>
            <div className="flex gap-2"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create"}</Button><Button type="button" variant="outline" onClick={() => router.push("/training")}>Cancel</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
