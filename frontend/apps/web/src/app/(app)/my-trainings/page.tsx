"use client";

import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/training/TrainingBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { useMyTrainings } from "@/hooks/useTraining";
import { formatDate } from "@/lib/format";

export default function MyTrainingsPage() {
  const trainings = useMyTrainings();
  if (trainings.isLoading) return <LoadingScreen label="Loading my trainings..." />;
  if (trainings.isError) return <ErrorAlert title="Error" message="Failed to load your trainings." />;
  const rows = trainings.data ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-h1 text-brand-primary">My Trainings</h1>
      <Card>
        <CardHeader><CardTitle>Assigned Trainings</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? <p className="text-body text-muted-foreground">No due-soon trainings assigned.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead><tr className="border-b border-border text-left"><th className="px-3 py-2">Training</th><th className="px-3 py-2">Due Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border last:border-0"><td className="px-3 py-2">Training #{r.trainingProgramId}</td><td className="px-3 py-2">{formatDate(r.dueDate)}</td><td className="px-3 py-2"><AssignmentStatusBadge status={r.status} dueDate={r.dueDate} /></td><td className="px-3 py-2 text-right"><Button asChild size="sm" variant="outline"><Link href={`/training/${r.trainingProgramId}`}>Mark Complete</Link></Button></td></tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
