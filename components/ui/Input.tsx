import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded border border-border-strong bg-surface px-2.5 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
