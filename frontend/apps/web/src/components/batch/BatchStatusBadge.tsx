import { StatusPill } from "@/components/common/StatusPill";
import { BATCH_STATUS_CLASSES, BATCH_STATUS_LABELS, type BatchStatus } from "@/types/batch";

/** Batch record status pill (thin wrapper over the generic StatusPill). */
export function BatchStatusBadge({ status, className }: { status: BatchStatus; className?: string }) {
  return <StatusPill status={status} labels={BATCH_STATUS_LABELS} classes={BATCH_STATUS_CLASSES} className={className} />;
}
