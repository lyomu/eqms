import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  /** Optional secondary line, e.g. "30 effective". */
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

/** Compact KPI card for the dashboard stats row. */
export function StatCard({ label, value, hint, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-label uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-h1 font-bold text-brand-primary">{value}</p>
          {hint && <p className="text-label text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-light text-brand-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </Card>
  );
}
