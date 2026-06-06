import { StatusPill } from "@/components/common/StatusPill";
import { RISK_STATUS_CLASSES, RISK_STATUS_LABELS, type RiskStatus } from "@/types/risk";

export function RiskStatusBadge({ status, className }: { status: RiskStatus; className?: string }) {
  return <StatusPill status={status} labels={RISK_STATUS_LABELS} classes={RISK_STATUS_CLASSES} className={className} />;
}
