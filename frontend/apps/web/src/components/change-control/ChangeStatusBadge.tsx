import { cn } from "@/lib/utils";
import { CHANGE_STATUS_LABELS, type ChangeStatus } from "@/types/change-control";

/** Status → color mapping for Change Control's 11-state lifecycle. */
const STATUS_CLASSES: Record<ChangeStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  UNDER_REVIEW: "bg-brand-light text-brand-primary",
  CHANGES_REQUESTED: "bg-warning/20 text-[#8A6D00]",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  APPROVED: "bg-success/15 text-success",
  IN_IMPLEMENTATION: "bg-brand-light text-brand-primary",
  IMPLEMENTED: "bg-success/15 text-success",
  PENDING_CLOSURE: "bg-warning/20 text-[#8A6D00]",
  CLOSED: "bg-success text-white",
  REJECTED: "bg-error/15 text-error",
  CANCELLED: "bg-slate-200 text-slate-700",
};

interface ChangeStatusBadgeProps {
  status: ChangeStatus;
  className?: string;
}

/** Reusable Change Control status pill. */
export function ChangeStatusBadge({ status, className }: ChangeStatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium whitespace-nowrap",
        STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {CHANGE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
