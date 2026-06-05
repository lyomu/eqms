import { cn } from "@/lib/utils";

interface StatusPillProps<S extends string> {
  status: S;
  labels: Record<S, string>;
  classes: Record<S, string>;
  className?: string;
}

/**
 * Generic status pill. A module supplies its own label + color maps; this avoids hand-writing a
 * near-identical badge component per module. Renders `data-status` for styling/testing hooks.
 */
export function StatusPill<S extends string>({ status, labels, classes, className }: StatusPillProps<S>) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-label font-medium whitespace-nowrap",
        classes[status] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
