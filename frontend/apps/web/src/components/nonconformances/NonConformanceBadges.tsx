import { Badge } from "@/components/ui/badge";
import type { NcDisposition, NcStatus, NcType } from "@/types/nonconformance";
import { NC_DISPOSITION_LABELS, NC_STATUS_LABELS, NC_TYPE_LABELS } from "@/types/nonconformance";

export function NcTypeBadge({ type }: { type: NcType }) {
  return <Badge variant={type === "MATERIAL" ? "info" : type === "PRODUCT" ? "success" : "warning"}>{NC_TYPE_LABELS[type]}</Badge>;
}
export function NcStatusBadge({ status }: { status: NcStatus }) {
  return <Badge variant={status === "CLOSED" ? "success" : status === "OPEN" ? "neutral" : "warning"}>{NC_STATUS_LABELS[status]}</Badge>;
}
export function NcDispositionBadge({ disposition }: { disposition: NcDisposition }) {
  return <Badge variant={disposition === "SCRAP" ? "error" : disposition === "REWORK" ? "warning" : disposition === "USE_AS_IS" ? "info" : "neutral"}>{NC_DISPOSITION_LABELS[disposition]}</Badge>;
}
