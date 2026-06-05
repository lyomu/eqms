import { StatusPill } from "@/components/common/StatusPill";
import { PRODUCT_STATUS_CLASSES, PRODUCT_STATUS_LABELS, type ProductStatus } from "@/types/product";

/** Product status pill (thin wrapper over the generic StatusPill). */
export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return <StatusPill status={status} labels={PRODUCT_STATUS_LABELS} classes={PRODUCT_STATUS_CLASSES} className={className} />;
}
