import { StatusPill } from "@/components/common/StatusPill";
import { OOS_STATUS_CLASSES, OOS_STATUS_LABELS, type OosStatus } from "@/types/oos";

export function OosStatusBadge({ status, className }: { status: OosStatus; className?: string }) {
  return <StatusPill status={status} labels={OOS_STATUS_LABELS} classes={OOS_STATUS_CLASSES} className={className} />;
}
