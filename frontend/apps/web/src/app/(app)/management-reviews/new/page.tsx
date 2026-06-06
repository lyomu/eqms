"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateManagementReview } from "@/hooks/useManagementReviews";

export default function NewManagementReviewPage() {
  const router = useRouter();
  const create = useCreateManagementReview();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const review = await create.mutateAsync({ reviewDate: String(f.get("reviewDate")), participants: String(f.get("participants")), scope: String(f.get("scope")) });
    toast.success("Management review scheduled");
    router.push(`/management-reviews/${review.id}`);
  }
  return <div className="max-w-3xl space-y-4"><h1 className="text-h1 text-brand-primary">Schedule Management Review</h1><Card><CardHeader><CardTitle>Review Details</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-1.5"><Label htmlFor="reviewDate">Review date *</Label><Input id="reviewDate" name="reviewDate" type="date" required /></div><div className="space-y-1.5"><Label htmlFor="participants">Participants</Label><Input id="participants" name="participants" placeholder="QA, Operations, Regulatory" /></div><div className="space-y-1.5"><Label htmlFor="scope">Scope</Label><Textarea id="scope" name="scope" rows={5} /></div><div className="flex gap-2"><Button disabled={create.isPending}>{create.isPending ? "Scheduling..." : "Schedule Review"}</Button><Button type="button" variant="outline" onClick={() => router.push("/management-reviews")}>Cancel</Button></div></form></CardContent></Card></div>;
}
