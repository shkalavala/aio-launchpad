import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-[13px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-pressed border border-accent",
        default:
          "bg-surface text-fg border border-border-strong hover:bg-bg-subtle active:bg-bg-muted",
        ghost: "text-fg hover:bg-bg-subtle active:bg-bg-muted",
        subtle:
          "bg-accent-subtle text-accent border border-transparent hover:bg-accent-subtle/70",
        danger:
          "bg-danger text-fg-inverse hover:opacity-90 border border-danger",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
