import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_TYPE_LABELS,
  type FindingSeverity,
  type SupplierStatus,
  type SupplierType,
} from "@/types/supplier";

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  const variant = status === "QUALIFIED" ? "success" : status === "CONDITIONAL" ? "warning" : "neutral";
  return <Badge variant={variant}>{SUPPLIER_STATUS_LABELS[status]}</Badge>;
}

export function SupplierTypeBadge({ type }: { type: SupplierType }) {
  const cls = type === "RAW_MATERIAL" ? "bg-brand-light text-brand-primary" : type === "PACKAGING" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium", cls)}>{SUPPLIER_TYPE_LABELS[type]}</span>;
}

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  const variant = severity === "CRITICAL" ? "error" : severity === "MAJOR" ? "warning" : "info";
  return <Badge variant={variant}>{severity[0] + severity.slice(1).toLowerCase()}</Badge>;
}

export function certificateExpiryClass(expiryDate: string | null | undefined) {
  if (!expiryDate) return "bg-muted text-muted-foreground";
  const diffDays = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return "bg-error/15 text-error";
  if (diffDays <= 30) return "bg-warning/20 text-[#8A6D00]";
  return "bg-success/15 text-success";
}

export function certificationStatus(expiryDate: string | null | undefined) {
  if (!expiryDate) return "Pending";
  const diffDays = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring";
  return "Certified";
}
