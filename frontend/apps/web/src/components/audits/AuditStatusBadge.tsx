import { StatusPill } from "@/components/common/StatusPill";
import { AUDIT_STATUS_CLASSES, AUDIT_STATUS_LABELS, type AuditStatus } from "@/types/audit";

export function AuditStatusBadge({ status, className }: { status: AuditStatus; className?: string }) {
  return <StatusPill status={status} labels={AUDIT_STATUS_LABELS} classes={AUDIT_STATUS_CLASSES} className={className} />;
}
