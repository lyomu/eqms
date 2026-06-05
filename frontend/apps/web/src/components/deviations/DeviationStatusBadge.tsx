import { StatusPill } from "@/components/common/StatusPill";
import {
  DEVIATION_STATUS_CLASSES,
  DEVIATION_STATUS_LABELS,
  type DeviationStatus,
} from "@/types/deviation";

/** Deviation status pill (thin wrapper over the generic StatusPill). */
export function DeviationStatusBadge({ status, className }: { status: DeviationStatus; className?: string }) {
  return (
    <StatusPill status={status} labels={DEVIATION_STATUS_LABELS} classes={DEVIATION_STATUS_CLASSES} className={className} />
  );
}
