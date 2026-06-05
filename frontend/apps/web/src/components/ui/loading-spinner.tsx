import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  /** Optional visually-rendered label; always announced to screen readers. */
  label?: string;
  size?: number;
}

/** Accessible loading indicator (role=status + sr-only label). */
export function LoadingSpinner({ className, label = "Loading…", size = 20 }: LoadingSpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}>
      <Loader2 className="animate-spin" style={{ width: size, height: size }} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-area centered spinner for page/section loading states. */
export function LoadingScreen({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <LoadingSpinner size={32} label={label} />
    </div>
  );
}
