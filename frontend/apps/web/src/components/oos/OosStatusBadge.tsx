import { Badge } from "@/components/ui/badge";
import { OOS_STATUS_LABELS, OOS_STATUS_VARIANT, type OosStatus } from "@/types/oos";

export function OosStatusBadge({ status, className }: { status: OosStatus | string; className?: string }) {
  const s = status as OosStatus;
  return (
    <Badge data-status={status} variant={OOS_STATUS_VARIANT[s] ?? "neutral"} className={className}>
      {OOS_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}
