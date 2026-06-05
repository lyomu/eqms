import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  /** Short error title. */
  title?: string;
  /** Detailed message. Never hide errors (frontend rule 4). */
  message: string;
  className?: string;
}

/** Inline error banner with role=alert for assistive tech. */
export function ErrorAlert({ title = "Error", message, className }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md border border-error/40 bg-error/10 p-4 text-body text-error",
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-error/90">{message}</p>
      </div>
    </div>
  );
}
