import { StatusPill } from "@/components/common/StatusPill";
import { COMPLAINT_STATUS_CLASSES, COMPLAINT_STATUS_LABELS, type ComplaintStatus } from "@/types/complaint";

export function ComplaintStatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  return <StatusPill status={status} labels={COMPLAINT_STATUS_LABELS} classes={COMPLAINT_STATUS_CLASSES} className={className} />;
}
