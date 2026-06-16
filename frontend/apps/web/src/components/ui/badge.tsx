import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status pill, modeled on the SimplerQMS list badges (e.g. "About Due", "Closed",
 * "Active", "Overdue"). Semantic variants map to the design-system status colors.
 * Used across every module list/detail to render record status.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-label font-semibold whitespace-nowrap ring-1 ring-inset",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground ring-border",
        info: "bg-accent text-accent-foreground ring-accent-foreground/10",
        success: "bg-success/15 text-success ring-success/20",
        warning: "bg-warning/20 text-[#7A5A00] ring-warning/30",
        error: "bg-error/15 text-error ring-error/20",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
