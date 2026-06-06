import { StatusPill } from "@/components/common/StatusPill";
import { EQUIPMENT_STATUS_CLASSES, EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from "@/types/equipment";

export function EquipmentStatusBadge({ status, className }: { status: EquipmentStatus; className?: string }) {
  return <StatusPill status={status} labels={EQUIPMENT_STATUS_LABELS} classes={EQUIPMENT_STATUS_CLASSES} className={className} />;
}
