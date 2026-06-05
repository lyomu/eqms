import { StatusPill } from "@/components/common/StatusPill";
import { CAPA_STATUS_CLASSES, CAPA_STATUS_LABELS, type CapaStatus } from "@/types/capa";

/** CAPA status pill (thin wrapper over the generic StatusPill with CAPA's label/color maps). */
export function CapaStatusBadge({ status, className }: { status: CapaStatus; className?: string }) {
  return <StatusPill status={status} labels={CAPA_STATUS_LABELS} classes={CAPA_STATUS_CLASSES} className={className} />;
}
