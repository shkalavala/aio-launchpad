import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide border",
  {
    variants: {
      tone: {
        neutral: "bg-bg-subtle text-fg-muted border-border",
        accent: "bg-accent-subtle text-accent border-accent/30",
        success: "bg-success-subtle text-success-fg border-success/30",
        warning: "bg-warning-subtle text-warning-fg border-warning/30",
        danger: "bg-danger-subtle text-danger-fg border-danger/30",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
