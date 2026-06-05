import { StatusPill } from "@/components/common/StatusPill";
import { MATERIAL_STATUS_CLASSES, MATERIAL_STATUS_LABELS, type MaterialStatus } from "@/types/material";

/** Material status pill (thin wrapper over the generic StatusPill). */
export function MaterialStatusBadge({ status, className }: { status: MaterialStatus; className?: string }) {
  return <StatusPill status={status} labels={MATERIAL_STATUS_LABELS} classes={MATERIAL_STATUS_CLASSES} className={className} />;
}
