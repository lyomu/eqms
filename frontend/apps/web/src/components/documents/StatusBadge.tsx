import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types/documents";

/** Human label for each document status. */
const STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  CHANGES_REQUESTED: "Changes Requested",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  EFFECTIVE: "Effective",
  SUPERSEDED: "Superseded",
  OBSOLETE: "Obsolete",
  ARCHIVED: "Archived",
};

/**
 * Color mapping per CLAUDE-FRONTEND / the M3 spec:
 * Draft gray · Under Review blue · Changes Requested / Pending Approval orange ·
 * Approved green · Effective darker green · Superseded light gray · Obsolete / Archived dark gray.
 */
const STATUS_CLASSES: Record<DocumentStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  UNDER_REVIEW: "bg-brand-light text-brand-primary",
  CHANGES_REQUESTED: "bg-warning/20 text-[#8A6D00]",
  PENDING_APPROVAL: "bg-warning/20 text-[#8A6D00]",
  APPROVED: "bg-success/15 text-success",
  EFFECTIVE: "bg-success text-white",
  SUPERSEDED: "bg-muted text-muted-foreground/80",
  OBSOLETE: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-slate-200 text-slate-700",
};

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

/** Reusable Document Control status pill with the controlled status→color mapping. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium whitespace-nowrap",
        STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export { STATUS_LABELS as DOCUMENT_STATUS_LABELS };
