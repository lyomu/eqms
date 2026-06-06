import { Badge } from "@/components/ui/badge";
import type { MrStatus } from "@/types/management-review";
import { MR_STATUS_LABELS } from "@/types/management-review";

export function ReviewStatusBadge({ status }: { status: MrStatus }) {
  return <Badge variant={status === "COMPLETED" ? "success" : status === "IN_PROGRESS" ? "warning" : "info"}>{MR_STATUS_LABELS[status]}</Badge>;
}
export function TrendBadge({ trend }: { trend: string | null | undefined }) {
  return <Badge variant={trend === "UP" ? "success" : trend === "DOWN" ? "error" : "neutral"}>{trend ?? "Stable"}</Badge>;
}
