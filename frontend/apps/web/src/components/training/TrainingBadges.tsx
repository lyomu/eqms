import { Badge } from "@/components/ui/badge";
import type { AssignmentStatus, TrainingResponse } from "@/types/training";

export function TrainingStatusBadge({ training }: { training: TrainingResponse }) {
  return <Badge variant={training.active ? "success" : "neutral"}>{training.active ? "Active" : "Inactive"}</Badge>;
}

export function AssignmentStatusBadge({ status, dueDate }: { status: AssignmentStatus; dueDate?: string | null }) {
  let computed = status;
  if (status !== "COMPLETED" && dueDate) {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) computed = "OVERDUE";
  }
  const variant = computed === "COMPLETED" ? "success" : computed === "OVERDUE" ? "error" : computed === "IN_PROGRESS" ? "info" : "warning";
  return <Badge variant={variant}>{computed.replace("_", " ")}</Badge>;
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-sm bg-muted">
      <div className="h-2 rounded-sm bg-success" style={{ width: `${pct}%` }} />
    </div>
  );
}
